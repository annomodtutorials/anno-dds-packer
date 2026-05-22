"""Python ↔ JavaScript bridge — PySide6 + QWebChannel edition.

Public methods are decorated with @Slot so QWebChannel exposes them on
the JS side as `window.bridge.<method>(...args, callback)`. A small JS
shim in webui/index.html maps the existing React code's pywebview-style
`window.pywebview.api.<method>(...)` Promise calls onto this surface.

Threading model:
- Slot methods run on the QObject's home thread = the Qt UI thread.
  pick_files / pick_folder open QFileDialog modally there; that's fine
  because the JS call returns its result via callback (no JS-thread block).
- start_convert spawns a worker thread that runs the packer pipeline.
- Progress events from the worker emit `_js_eval_requested` (a Qt signal).
  A slot on the bridge — connected via Qt.QueuedConnection — receives the
  signal on the UI thread and calls QWebEnginePage.runJavaScript safely.

`native_drop` is callable from the shell's dropEvent (also on UI thread).
"""
from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path

from PySide6.QtCore import QObject, Signal, Slot, Qt
from PySide6.QtWebEngineCore import QWebEnginePage
from PySide6.QtWidgets import QFileDialog

import packer
import settings as settings_mod
import vram as vram_mod
from config import LOD0_SIZE_AS_INPUT, LOD0_SIZE_OPTIONS, TextureSet

log = logging.getLogger(__name__)


def _ts_inputs(ts: TextureSet) -> list[str]:
    out: list[str] = []
    if ts.diff is not None:    out.append("diff")
    if isinstance(ts.norm, Path): out.append("norm")
    if ts.metal is not None:   out.append("metal")
    if ts.ao is not None:      out.append("ao")
    if ts.gloss is not None:   out.append("gloss")
    if ts.rough is not None:   out.append("rough")
    if ts.height is not None:  out.append("height")
    if ts.rm is not None:      out.append("rm")
    if ts.orm is not None:     out.append("orm")
    if ts.opacity is not None: out.append("opacity")
    return out


def _ts_outputs(ts: TextureSet) -> list[str]:
    out: list[str] = []
    if ts.diff is not None:
        out.append("diff")
    has_norm = (
        isinstance(ts.norm, Path) or ts.synthetic_flat_normal
        or ts.gloss is not None or ts.rough is not None
        or ts.rm is not None or ts.orm is not None
    )
    if has_norm:
        out.append("norm")
    if ts.metal is not None or ts.rm is not None or ts.orm is not None:
        out.append("metal")
    if ts.height is not None:
        out.append("height")
    return out


class Bridge(QObject):
    """QWebChannel-exposed bridge. Public methods are @Slot-decorated."""

    # Cross-thread JS push: worker threads emit `_js_eval_requested(str)`;
    # the connected slot runs on the UI thread and calls runJavaScript.
    _js_eval_requested = Signal(str)

    # Emitted once when JS calls `notify_ready` after React's first paint —
    # the shell uses this to swap from the native splash to the WebView.
    app_ready = Signal()

    def __init__(self) -> None:
        super().__init__()
        self._page: QWebEnginePage | None = None
        self._settings = settings_mod.load()
        self._sets: dict[int, TextureSet] = {}
        self._worker: threading.Thread | None = None
        self._is_converting = False
        self._active_sets = 0
        self._last_output_dirs: set[str] = set()
        # Per-set completion records so that re-scanning (Add Files, re-drop)
        # doesn't wipe output_dir / status from already-converted rows.
        # Written by worker threads (CPython GIL guarantees dict-item writes
        # are atomic); read from the Qt UI thread in _all_queue_rows().
        self._completed_rows: dict[int, dict] = {}   # set_id → {output_dir, error}

        # Marshal any JS-eval requests onto the UI thread.
        self._js_eval_requested.connect(self._eval_on_ui_thread,
                                        Qt.ConnectionType.QueuedConnection)

    # — Shell wiring (called by anno_dds_packer.py) —

    def _attach_page(self, page: QWebEnginePage) -> None:
        self._page = page

    @Slot()
    def notify_ready(self) -> None:
        """Called from JS exactly once, after React's first useEffect.
        The shell swaps from the native splash to the WebView when this
        fires."""
        self.app_ready.emit()

    @Slot(str)
    def _eval_on_ui_thread(self, expr: str) -> None:
        if self._page is not None:
            try:
                self._page.runJavaScript(expr)
            except Exception:
                log.debug("runJavaScript failed for: %s", expr[:80])

    def _call_js(self, expr: str) -> None:
        """Safe to call from any thread."""
        if self._page is None:
            return
        self._js_eval_requested.emit(expr)

    # — Settings —

    @Slot(result="QVariant")
    def load_settings(self) -> dict:
        s = self._settings
        return {
            "theme_name": s.theme_name,
            "selected_lods": list(s.selected_lods),
            "lod0_size": s.lod0_size,
            "fast_mode": s.fast_mode,
            "same_as_input": s.same_as_input,
            "output_dir": s.output_dir,
            "parallel_sets_max": s.parallel_sets_max,
            "lod0_size_options": list(LOD0_SIZE_OPTIONS),
        }

    @Slot("QVariant", result=bool)
    def save_settings(self, payload) -> bool:
        if not isinstance(payload, dict):
            return False
        s = self._settings
        if "theme_name" in payload:
            s.theme_name = payload["theme_name"] if payload["theme_name"] in ("anno", "modern") else "anno"
        if "selected_lods" in payload:
            try:
                s.selected_lods = sorted({0, *(int(n) for n in payload["selected_lods"])})
            except (TypeError, ValueError):
                pass
        if "lod0_size" in payload:
            s.lod0_size = str(payload["lod0_size"])
        if "fast_mode" in payload:
            s.fast_mode = bool(payload["fast_mode"])
        if "same_as_input" in payload:
            s.same_as_input = bool(payload["same_as_input"])
        if "output_dir" in payload:
            s.output_dir = str(payload["output_dir"])
        if "parallel_sets_max" in payload and payload["parallel_sets_max"] is not None:
            try:
                s.parallel_sets_max = int(payload["parallel_sets_max"])
            except (TypeError, ValueError):
                pass
        settings_mod.save(s)
        return True

    # — File pickers (QFileDialog instead of pywebview) —

    @Slot(result="QVariant")
    def pick_files(self) -> list[str]:
        files, _ = QFileDialog.getOpenFileNames(
            None,
            "Pick texture files",
            self._settings.output_dir or "",
            "Image files (*.png *.jpg *.jpeg *.bmp *.tga *.tif *.tiff *.webp);;All files (*.*)",
        )
        return [str(Path(p)) for p in files]

    @Slot(result=str)
    def pick_folder(self) -> str:
        d = QFileDialog.getExistingDirectory(
            None, "Pick output folder", self._settings.output_dir or "",
        )
        return str(Path(d)) if d else ""

    @Slot(result=str)
    def pick_scan_folder(self) -> str:
        d = QFileDialog.getExistingDirectory(
            None, "Pick folder to scan", self._settings.output_dir or "",
        )
        return str(Path(d)) if d else ""

    # — Scan + convert —

    @Slot("QVariant", result="QVariant")
    def scan_paths(self, raw_paths) -> list[dict]:
        if raw_paths is None:
            return []
        paths = [Path(p) for p in raw_paths if p]
        new_sets = packer.scan_paths(paths)

        existing_keys: dict[tuple[str, str], int] = {}
        for sid, ts in self._sets.items():
            primary = ts.primary_thumbnail_source()
            parent = str(primary.parent) if primary else ""
            existing_keys[(parent, ts.base_name)] = sid

        next_sid = (max(self._sets.keys()) + 1) if self._sets else 0
        for ts in new_sets:
            primary = ts.primary_thumbnail_source()
            parent = str(primary.parent) if primary else ""
            key = (parent, ts.base_name)
            if key in existing_keys:
                self._sets[existing_keys[key]] = ts
            else:
                self._sets[next_sid] = ts
                next_sid += 1
        return self._all_queue_rows()

    def _all_queue_rows(self) -> list[dict]:
        rows: list[dict] = []
        total = len(self._sets)
        for i, (sid, ts) in enumerate(self._sets.items()):
            comp = self._completed_rows.get(sid)
            if comp:
                # Set already completed — preserve its done/error state so
                # that calling scan_paths (Add Files, re-drop) doesn't wipe
                # the output_dir and "Open Folder" button from the UI.
                rows.append({
                    "set_id": sid,
                    "name": ts.base_name,
                    "input_map_types": _ts_inputs(ts),
                    "output_map_types": _ts_outputs(ts),
                    "status": comp["status"],
                    "pct": comp["pct"],
                    "label": comp["label"],
                    "eta_text": comp["eta_text"],
                    "queue_position": f"{i + 1} of {total}",
                    "maps_done": comp["maps_done"],
                    "output_dir": comp["output_dir"],
                    "error_text": comp["error_text"],
                })
            else:
                rows.append({
                    "set_id": sid,
                    "name": ts.base_name,
                    "input_map_types": _ts_inputs(ts),
                    "output_map_types": _ts_outputs(ts),
                    "status": "queued",
                    "pct": 0,
                    "label": "WAITING IN QUEUE",
                    "eta_text": f"Position {i + 1} of {total}",
                    "queue_position": f"{i + 1} of {total}",
                    "maps_done": [],
                    "output_dir": "",
                    "error_text": "",
                })
        return rows

    @Slot("QVariant", result=bool)
    def start_convert(self, opts) -> bool:
        if self._is_converting or not self._sets:
            return False
        s = self._settings
        cap = s.parallel_sets_max or min(os.cpu_count() or 4, 8)
        out_root = Path(s.output_dir) if s.output_dir else Path.cwd()
        sets = list(self._sets.values())
        id_map = {id(ts): sid for sid, ts in self._sets.items()}

        self._is_converting = True

        def worker() -> None:
            try:
                packer.convert_sets_parallel(
                    sets,
                    lod0_cap=self._normalised_lod0_cap(s.lod0_size),
                    selected_lods=list(s.selected_lods),
                    fast_mode=s.fast_mode,
                    out_root=out_root,
                    same_as_input=s.same_as_input,
                    cap=cap,
                    push_event=self._push_progress,
                    set_ids=id_map,
                )
            except Exception:
                log.exception("convert worker crashed")
            finally:
                self._is_converting = False
                self._active_sets = 0
                self._call_js("window.__onBatchDone && window.__onBatchDone()")

        t = threading.Thread(target=worker, daemon=True, name="ddsp-convert")
        t.start()
        self._worker = t
        return True

    @staticmethod
    def _normalised_lod0_cap(ui_value: str) -> str:
        if (ui_value or "").strip().lower() == "as input":
            return LOD0_SIZE_AS_INPUT
        return ui_value

    # — Live status —

    @Slot(result="QVariant")
    def vram(self) -> dict:
        used, total = vram_mod.vram_gb()
        return {"used": used or 0.0, "total": total or 0.0}

    @Slot(result=int)
    def parallel_cap(self) -> int:
        s = self._settings
        return s.parallel_sets_max or min(os.cpu_count() or 4, 8)

    @Slot(result="QVariant")
    def parallel_status(self) -> dict:
        return {"active": self._active_sets, "cap": self.parallel_cap()}

    @Slot(result=int)
    def cpu_count(self) -> int:
        return os.cpu_count() or 1

    # — Internal: ProgressEvent → JS —

    def _push_progress(self, ev) -> None:
        if ev.status == "done" or ev.status == "error":
            self._active_sets = max(0, self._active_sets - 1)
        elif ev.status == "encoding" and ev.pct < 5:
            self._active_sets += 1
        if ev.output_dir:
            self._last_output_dirs.add(ev.output_dir)

        eta_text = ""
        if ev.status == "done":
            eta_text = "100%"
        elif ev.status == "queued":
            n = ev.set_id + 1
            total = len(self._sets) or n
            eta_text = f"Position {n} of {total}"
        elif ev.eta_s is not None:
            mins = int(ev.eta_s // 60)
            secs = int(ev.eta_s % 60)
            eta_text = f"{int(ev.pct)}%  ·  {mins:02d}:{secs:02d} ETA"
        else:
            eta_text = f"{int(ev.pct)}%"

        maps_done = list(ev.maps_done) if ev.maps_done else []
        error_text = ev.error or ""
        output_dir = ev.output_dir or ""

        # Persist terminal states so _all_queue_rows() can restore them if the
        # user calls scan_paths (Add Files / re-drop) after conversion finishes.
        # CPython's GIL makes dict item assignment atomic; no lock needed.
        if ev.status in ("done", "error"):
            self._completed_rows[ev.set_id] = {
                "status": ev.status,
                "pct": float(ev.pct),
                "label": ev.label or "",
                "eta_text": eta_text,
                "maps_done": maps_done,
                "output_dir": output_dir,
                "error_text": error_text,
            }

        payload = {
            "set_id": ev.set_id,
            "status": ev.status,
            "pct": float(ev.pct),
            "label": ev.label or "",
            "eta_text": eta_text,
            "maps_done": maps_done,
            "error_text": error_text,
            "output_dir": output_dir,
        }
        js = "window.__updateProgress && window.__updateProgress(" + json.dumps(payload) + ");"
        self._call_js(js)

    # — Drag-drop with real paths (called by the PySide6 shell, NOT from JS) —

    def native_drop(self, paths: list[str]) -> None:
        """Called by the shell's dropEvent. Pushes the real disk paths to
        the React side via window.__onFilesDropped, which calls scan_paths
        with those real paths so 'Same as input' resolves correctly."""
        js_paths = json.dumps([str(p) for p in paths])
        self._call_js(f"window.__onFilesDropped && window.__onFilesDropped({js_paths});")

    # — HTML5 drop receiver (legacy path; no longer wired by default but kept
    #   for tests + as a byte-stream fallback if a future host lacks paths) —

    @Slot("QVariant", result="QVariant")
    def receive_dropped_files(self, payload) -> list[dict]:
        import base64
        import tempfile
        if not payload:
            return []
        tmp = Path(tempfile.mkdtemp(prefix="anno_drop_"))
        for item in payload:
            try:
                rel = str(item.get("path", "")).replace("\\", "/").lstrip("/")
                if not rel:
                    continue
                dst = tmp / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.write_bytes(base64.b64decode(item.get("data", "")))
            except Exception:
                log.exception("failed to write dropped file %r", item.get("path"))
        return self.scan_paths([str(tmp)])

    # — Queue control —

    @Slot(result=bool)
    def clear_queue(self) -> bool:
        if self._is_converting:
            return False
        self._sets = {}
        self._last_output_dirs.clear()
        self._completed_rows.clear()
        return True

    # — Explorer integration —

    @Slot(str, result=bool)
    def open_folder(self, path: str) -> bool:
        try:
            target = Path(path).resolve()
            if not target.exists():
                return False
            os.startfile(str(target))
            return True
        except OSError as e:
            log.warning("open_folder(%s) failed: %s", path, e)
            return False

    @Slot(result="QVariant")
    def last_output_dirs(self) -> list[str]:
        return sorted(self._last_output_dirs)
