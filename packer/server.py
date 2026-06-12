"""FastAPI HTTP server — Tauri sidecar edition.

Replaces the QWebChannel Bridge from v03. All packer logic is identical;
only the transport changes (HTTP + SSE instead of QWebChannel).

Startup: writes "PORT=<n>" to stdout so the Tauri host can read it.
Progress: pushed via SSE on GET /events.
File dialogs / open_folder: handled by Tauri (Rust commands), NOT here.
"""
from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import logging
import os
import sys
import tempfile
import threading
import traceback
from io import BytesIO
from pathlib import Path

# ── Debug log — written as early as possible so we can diagnose spawn issues ──
def _write_debug_log(msg: str) -> None:
    try:
        log_path = Path(os.environ.get("USERPROFILE", "C:/Users/Public")) / "packer_server_debug.log"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass

_write_debug_log(f"=== packer-server starting ===")
_write_debug_log(f"exe: {sys.executable}")
_write_debug_log(f"frozen: {getattr(sys, 'frozen', False)}")
_write_debug_log(f"cwd: {os.getcwd()}")
_write_debug_log(f"argv: {sys.argv}")

import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from sse_starlette.sse import EventSourceResponse

# Add packer directory to path so we can import packer modules
sys.path.insert(0, str(Path(__file__).parent))

import packer as packer_mod
import settings as settings_mod
import unpacker as unpacker_mod
import vram as vram_mod
from config import LOD0_SIZE_AS_INPUT, LOD0_SIZE_OPTIONS, TextureSet
from events import ProgressEvent

log = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, stream=sys.stderr)

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    global _loop, _sse_queue
    _loop = asyncio.get_event_loop()
    _sse_queue = asyncio.Queue()
    _write_debug_log("lifespan: app started, accepting requests")
    yield
    _write_debug_log("lifespan: app shutting down")

app = FastAPI(lifespan=lifespan)

# Allow requests from the Tauri webview (tauri://localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── App state ────────────────────────────────────────────────────────────────

_settings = settings_mod.load()
_sets: dict[int, TextureSet] = {}
_worker: threading.Thread | None = None
_is_converting = False
_active_sets = 0
_last_output_dirs: set[str] = set()
_completed_rows: dict[int, dict] = {}

# ─── Unpack state ─────────────────────────────────────────────────────────────
_unpack_sets: dict[int, object] = {}   # int -> unpacker_mod.UnpackSet
_is_unpacking = False
_unpack_active_sets = 0
_unpack_completed_rows: dict[int, dict] = {}

# SSE event queue (asyncio) for pushing progress to the webview
_loop: asyncio.AbstractEventLoop | None = None
_sse_queue: asyncio.Queue | None = None


def _ts_inputs(ts: TextureSet) -> list[str]:
    if ts.is_icon:
        return ["icon"] if ts.diff is not None else []
    out: list[str] = []
    if ts.diff is not None:    out.append("diff")
    if isinstance(ts.norm, Path): out.append("norm")
    if ts.metal is not None:   out.append("metal")
    if ts.ao is not None:      out.append("ao")
    if ts.gloss is not None:   out.append("gloss")
    if ts.rough is not None:   out.append("rough")
    if ts.height is not None:  out.append("height")
    if ts.rm is not None:       out.append("rm")
    if ts.orm is not None:      out.append("orm")
    if ts.opacity is not None:  out.append("opacity")
    if ts.emission is not None: out.append("emission")
    return out


def _ts_outputs(ts: TextureSet) -> list[str]:
    if ts.is_icon:
        return ["icon"] if ts.diff is not None else []
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
    if ts.emission is not None:
        out.append("mask")
    return out


def _all_queue_rows() -> list[dict]:
    rows: list[dict] = []
    total = len(_sets)
    for i, (sid, ts) in enumerate(_sets.items()):
        comp = _completed_rows.get(sid)
        if comp:
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


def _all_unpack_queue_rows() -> list[dict]:
    rows: list[dict] = []
    total = len(_unpack_sets)
    for i, (sid, us) in enumerate(_unpack_sets.items()):
        comp = _unpack_completed_rows.get(sid)
        input_dds_types = us.map_types_ordered()
        output_png_types = us.output_png_types()
        if comp:
            rows.append({
                "set_id": sid,
                "name": us.base_name,
                "input_dds_types": input_dds_types,
                "output_png_types": output_png_types,
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
                "name": us.base_name,
                "input_dds_types": input_dds_types,
                "output_png_types": output_png_types,
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


def _push_to_sse(event_type: str, data: dict | str) -> None:
    """Thread-safe push to SSE queue."""
    if _loop is None or _sse_queue is None:
        return
    asyncio.run_coroutine_threadsafe(
        _sse_queue.put({"event": event_type, "data": data}),
        _loop,
    )


def _push_unpack_progress(ev: ProgressEvent) -> None:
    global _unpack_active_sets
    if ev.status == "done" or ev.status == "error":
        _unpack_active_sets = max(0, _unpack_active_sets - 1)
    elif ev.status == "encoding" and ev.pct < 5:
        _unpack_active_sets += 1
    if ev.output_dir:
        _last_output_dirs.add(ev.output_dir)

    eta_text = ""
    if ev.status == "done":
        eta_text = "100%"
    elif ev.eta_s is not None:
        mins = int(ev.eta_s // 60)
        secs = int(ev.eta_s % 60)
        eta_text = f"{int(ev.pct)}%  ·  {mins:02d}:{secs:02d} ETA"
    else:
        eta_text = f"{int(ev.pct)}%"

    maps_done = list(ev.maps_done) if ev.maps_done else []
    error_text = ev.error or ""
    output_dir = ev.output_dir or ""

    if ev.status in ("done", "error"):
        _unpack_completed_rows[ev.set_id] = {
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
    _push_to_sse("progress", payload)


def _push_progress(ev: ProgressEvent) -> None:
    global _active_sets
    if ev.status == "done" or ev.status == "error":
        _active_sets = max(0, _active_sets - 1)
    elif ev.status == "encoding" and ev.pct < 5:
        _active_sets += 1
    if ev.output_dir:
        _last_output_dirs.add(ev.output_dir)

    eta_text = ""
    if ev.status == "done":
        eta_text = "100%"
    elif ev.status == "queued":
        n = ev.set_id + 1
        total = len(_sets) or n
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

    if ev.status in ("done", "error"):
        _completed_rows[ev.set_id] = {
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
    _push_to_sse("progress", payload)


# ─── SSE endpoint ─────────────────────────────────────────────────────────────

@app.get("/events")
async def events(request: Request):
    async def generate():
        assert _sse_queue is not None
        while True:
            if await request.is_disconnected():
                break
            try:
                item = await asyncio.wait_for(_sse_queue.get(), timeout=15.0)
                yield {
                    "event": item["event"],
                    "data": json.dumps(item["data"]),
                }
            except asyncio.TimeoutError:
                # Keepalive comment
                yield {"comment": "keepalive"}
    return EventSourceResponse(generate())


# ─── Settings ─────────────────────────────────────────────────────────────────

@app.post("/api/load_settings")
async def load_settings():
    s = _settings
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


@app.post("/api/save_settings")
async def save_settings(request: Request):
    payload = await request.json()
    if not isinstance(payload, dict):
        return False
    s = _settings
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


# ─── Scan + convert ───────────────────────────────────────────────────────────

@app.post("/api/scan_paths")
async def scan_paths(request: Request):
    global _sets
    raw_paths = await request.json()
    if not raw_paths:
        return []
    paths = [Path(p) for p in raw_paths if p]
    new_sets = packer_mod.scan_paths(paths)

    existing_keys: dict[tuple[str, str], int] = {}
    for sid, ts in _sets.items():
        primary = ts.primary_thumbnail_source()
        parent = str(primary.parent) if primary else ""
        existing_keys[(parent, ts.base_name)] = sid

    next_sid = (max(_sets.keys()) + 1) if _sets else 0
    for ts in new_sets:
        primary = ts.primary_thumbnail_source()
        parent = str(primary.parent) if primary else ""
        key = (parent, ts.base_name)
        if key in existing_keys:
            # Merge: copy any newly-provided fields into the existing set
            # so a single dropped file doesn't wipe the rest of the set.
            existing_ts = _sets[existing_keys[key]]
            for attr in ('diff', 'opacity', 'metal', 'ao', 'norm',
                         'gloss', 'rough', 'height', 'rm', 'orm', 'emission'):
                new_val = getattr(ts, attr, None)
                if new_val is not None:
                    setattr(existing_ts, attr, new_val)
            # If a real normal was just added, clear the synthetic-flat flag
            if isinstance(existing_ts.norm, Path):
                existing_ts.synthetic_flat_normal = False
            packer_mod.apply_packed_pbr_postprocess([existing_ts])
        else:
            _sets[next_sid] = ts
            next_sid += 1
    return _all_queue_rows()


@app.post("/api/start_convert")
async def start_convert(request: Request):
    global _worker, _is_converting, _active_sets
    if _is_converting or not _sets:
        return False
    s = _settings
    cap = s.parallel_sets_max or min(os.cpu_count() or 4, 8)
    out_root = Path(s.output_dir) if s.output_dir else Path.cwd()
    sets = list(_sets.values())
    id_map = {id(ts): sid for sid, ts in _sets.items()}
    _is_converting = True

    def worker() -> None:
        global _is_converting, _active_sets
        try:
            lod0_cap = s.lod0_size
            if (lod0_cap or "").strip().lower() == "as input":
                lod0_cap = LOD0_SIZE_AS_INPUT
            packer_mod.convert_sets_parallel(
                sets,
                lod0_cap=lod0_cap,
                selected_lods=list(s.selected_lods),
                fast_mode=s.fast_mode,
                out_root=out_root,
                same_as_input=s.same_as_input,
                cap=cap,
                push_event=_push_progress,
                set_ids=id_map,
            )
        except Exception:
            log.exception("convert worker crashed")
        finally:
            _is_converting = False
            _active_sets = 0
            _push_to_sse("batch_done", {})

    t = threading.Thread(target=worker, daemon=True, name="ddsp-convert")
    t.start()
    _worker = t
    return True


# ─── Live status ──────────────────────────────────────────────────────────────

@app.post("/api/vram")
async def vram():
    used, total = vram_mod.vram_gb()
    return {"used": used or 0.0, "total": total or 0.0}


@app.post("/api/parallel_cap")
async def parallel_cap():
    s = _settings
    return s.parallel_sets_max or min(os.cpu_count() or 4, 8)


@app.post("/api/parallel_status")
async def parallel_status():
    s = _settings
    cap = s.parallel_sets_max or min(os.cpu_count() or 4, 8)
    return {"active": _active_sets + _unpack_active_sets, "cap": cap}


@app.post("/api/cpu_count")
async def cpu_count():
    return os.cpu_count() or 1


# ─── Queue control ────────────────────────────────────────────────────────────

@app.post("/api/clear_queue")
async def clear_queue():
    global _sets, _last_output_dirs, _completed_rows
    if _is_converting:
        return False
    _sets = {}
    _last_output_dirs.clear()
    _completed_rows.clear()
    return True


@app.post("/api/remove_set")
async def remove_set(request: Request):
    """Remove a single texture set from the queue."""
    if _is_converting:
        return False
    body = await request.json()
    set_id = int(body) if not isinstance(body, dict) else int(body.get("set_id", -1))
    _sets.pop(set_id, None)
    return True


@app.post("/api/last_output_dirs")
async def last_output_dirs():
    return sorted(_last_output_dirs)


# ─── Unpack scan + convert ────────────────────────────────────────────────────

@app.post("/api/scan_dds_paths")
async def scan_dds_paths(request: Request):
    global _unpack_sets
    raw_paths = await request.json()
    if not raw_paths:
        return []
    paths = [Path(p) for p in raw_paths if p]
    new_sets = unpacker_mod.scan_dds_paths(paths)

    existing_keys: dict[tuple[str, str], int] = {}
    for sid, us in _unpack_sets.items():
        primary = us.primary_path()
        parent = str(primary.parent) if primary else ""
        existing_keys[(parent, us.base_name)] = sid

    next_sid = (max(_unpack_sets.keys()) + 1) if _unpack_sets else 0
    for us in new_sets:
        primary = us.primary_path()
        parent = str(primary.parent) if primary else ""
        key = (parent, us.base_name)
        if key in existing_keys:
            # Merge: add/replace DDS files by map_type+lod so dropping a
            # single DDS doesn't wipe the rest of the set.
            existing_us = _unpack_sets[existing_keys[key]]
            for new_file in us.files:
                existing_us.files = [
                    f for f in existing_us.files
                    if not (f.map_type == new_file.map_type and f.lod == new_file.lod)
                ]
                existing_us.files.append(new_file)
        else:
            _unpack_sets[next_sid] = us
            next_sid += 1
    return _all_unpack_queue_rows()


@app.post("/api/start_unpack")
async def start_unpack(request: Request):
    global _worker, _is_unpacking, _unpack_active_sets
    if _is_unpacking or not _unpack_sets:
        return False
    s = _settings
    cap = s.parallel_sets_max or min(os.cpu_count() or 4, 8)
    out_root = Path(s.output_dir) if s.output_dir else Path.cwd()
    items = list(_unpack_sets.items())
    _is_unpacking = True

    def worker() -> None:
        global _is_unpacking, _unpack_active_sets
        try:
            unpacker_mod.unpack_sets_parallel(
                items,
                out_root=out_root,
                same_as_input=s.same_as_input,
                cap=cap,
                push_event=_push_unpack_progress,
            )
        except Exception:
            log.exception("unpack worker crashed")
        finally:
            _is_unpacking = False
            _unpack_active_sets = 0
            _push_to_sse("batch_done", {})

    t = threading.Thread(target=worker, daemon=True, name="ddsp-unpack")
    t.start()
    _worker = t
    return True


@app.post("/api/clear_unpack_queue")
async def clear_unpack_queue():
    global _unpack_sets, _unpack_completed_rows
    if _is_unpacking:
        return False
    _unpack_sets = {}
    _unpack_completed_rows.clear()
    return True


@app.post("/api/remove_unpack_set")
async def remove_unpack_set(request: Request):
    if _is_unpacking:
        return False
    body = await request.json()
    set_id = int(body) if not isinstance(body, dict) else int(body.get("set_id", -1))
    _unpack_sets.pop(set_id, None)
    return True


@app.post("/api/check_conflicts")
async def check_conflicts():
    """Return count of output files that already exist on disk.

    Used by the frontend to warn the user before overwriting.
    Checks both the pack queue (_sets) and unpack queue (_unpack_sets).
    """
    s = _settings
    out_root = Path(s.output_dir) if s.output_dir else None
    conflict_files: list[str] = []

    # Pack mode: expected outputs are  {base}_{maptype}_{lod}.dds
    for ts in _sets.values():
        if s.same_as_input:
            src = ts.primary_thumbnail_source()
            out_dir = src.parent if src else (out_root or Path.cwd())
        else:
            out_dir = out_root or Path.cwd()
        if out_dir.exists():
            for f in out_dir.glob(f"{ts.base_name}_*.dds"):
                conflict_files.append(str(f))

    # Unpack mode: expected outputs are  {base}_{channel}_{lod}.png
    for us in _unpack_sets.values():
        seen: set[str] = set()
        for dds_file in us.files:
            if s.same_as_input:
                out_dir = dds_file.path.parent
            else:
                out_dir = out_root or Path.cwd()
            key = str(out_dir)
            if key in seen:
                continue
            seen.add(key)
            if out_dir.exists():
                for f in out_dir.glob(f"{us.base_name}_*.png"):
                    conflict_files.append(str(f))

    # Return count + first 6 examples for the dialog
    return {
        "count": len(conflict_files),
        "examples": [Path(f).name for f in conflict_files[:6]],
    }


# ─── Image preview / inspector ────────────────────────────────────────────────
# A GET endpoint that returns PNG bytes so the webview can use it directly as an
# <img src>. Four sources:
#   pack/input   → the source image file the user dropped (downscaled)
#   pack/output  → a live render of the packed DDS (build_map_at_lod)
#   unpack/input → the DDS decoded to PNG via texconv (cached)
#   unpack/output→ a single extracted channel rendered in-memory

_PREVIEW_TMP = tempfile.TemporaryDirectory(prefix="ddsp_preview_")
_dds_decode_cache: dict[str, str] = {}   # cache-key → decoded-PNG path

# Map a pack-input chip type to its TextureSet attribute.
_PACK_INPUT_FIELD = {
    "diff": "diff", "opacity": "opacity", "norm": "norm", "metal": "metal",
    "ao": "ao", "gloss": "gloss", "rough": "rough", "height": "height",
    "rm": "rm", "orm": "orm", "emission": "emission", "icon": "diff",
}

# Human labels for the inspector header.
_PACK_INPUT_LABEL = {
    "diff": "Diffuse", "opacity": "Opacity", "norm": "Normal", "metal": "Metal",
    "ao": "Ambient Occlusion", "gloss": "Glossiness", "rough": "Roughness",
    "height": "Height", "rm": "Packed M+R", "orm": "Packed O+R+M",
    "emission": "Emission", "icon": "Icon",
}
_PACK_OUTPUT_LABEL = {
    "diff": "DIFFUSE.DDS", "norm": "NORMAL.DDS", "metal": "METAL.DDS",
    "height": "HEIGHT.DDS", "mask": "MASK.DDS", "icon": "ICON.DDS",
}
_PNG_OUTPUT_LABEL = {
    "diffuse": "DIFFUSE.PNG", "opacity": "OPACITY.PNG", "normal": "NORMAL.PNG",
    "rough": "ROUGHNESS.PNG", "metal": "METAL.PNG", "ao": "AO.PNG",
    "height": "HEIGHT.PNG", "emission": "EMISSION.PNG", "mask_alpha": "MASK_ALPHA.PNG",
}


def _pack_input_path(ts, map_type: str) -> Path | None:
    field = _PACK_INPUT_FIELD.get(map_type)
    if not field:
        return None
    val = getattr(ts, field, None)
    return val if isinstance(val, Path) else None


def _find_dds(us, map_type: str | None, lod: int):
    """Pick a DdsFile of the given map_type — preferring the requested lod,
    else the lowest lod available."""
    if not map_type:
        return None
    candidates = [f for f in us.files if f.map_type == map_type]
    if not candidates:
        return None
    if lod is not None and lod >= 0:
        for f in candidates:
            if f.lod == lod:
                return f
    return min(candidates, key=lambda f: f.lod)


def _decode_dds_cached(path: Path) -> Image.Image | None:
    """Decode a DDS to RGBA via texconv, caching by path + mtime + size."""
    try:
        st = path.stat()
    except OSError:
        return None
    key = f"{path}|{st.st_mtime_ns}|{st.st_size}"
    cached = _dds_decode_cache.get(key)
    if cached and Path(cached).exists():
        im = Image.open(cached)
        im.load()
        return im.convert("RGBA")

    with tempfile.TemporaryDirectory() as td:
        out = unpacker_mod._texconv_to_png(path, Path(td))
        if out is None:
            return None
        dst = Path(_PREVIEW_TMP.name) / (hashlib.md5(key.encode()).hexdigest() + ".png")
        try:
            out.replace(dst)
        except OSError:
            im = Image.open(out)
            im.load()
            return im.convert("RGBA")
    _dds_decode_cache[key] = str(dst)
    im = Image.open(dst)
    im.load()
    return im.convert("RGBA")


def _preview_build_size(native: tuple[int, int], maxdim: int) -> tuple[int, int]:
    if not maxdim or max(native) <= maxdim:
        return native
    s = maxdim / max(native)
    return (max(1, int(native[0] * s)), max(1, int(native[1] * s)))


def _render_preview(mode: str, kind: str, set_id: int, map_type: str,
                    lod: int, maxdim: int) -> Image.Image | None:
    if mode == "pack":
        ts = _sets.get(set_id)
        if ts is None:
            return None
        if kind == "input":
            p = _pack_input_path(ts, map_type)
            if p is None or not p.exists():
                return None
            im = Image.open(p)
            im.load()
            return im.convert("RGBA")
        # output: render the packed channel live, at preview resolution
        native = packer_mod.reference_size(ts)
        size = _preview_build_size(native, maxdim)
        return packer_mod.build_map_at_lod(ts, map_type, size)

    # unpack
    us = _unpack_sets.get(set_id)
    if us is None:
        return None
    if kind == "input":
        f = _find_dds(us, map_type, lod)
        return _decode_dds_cached(f.path) if f else None
    # output: decode the source DDS then extract the requested channel
    src_mt = unpacker_mod.PNG_TYPE_TO_DDS.get(map_type)
    f = _find_dds(us, src_mt, lod)
    if f is None:
        return None
    rgba = _decode_dds_cached(f.path)
    if rgba is None:
        return None
    return unpacker_mod.extract_channel_image(rgba, map_type)


def _png_response_bytes(img: Image.Image, maxdim: int) -> bytes:
    if maxdim and max(img.size) > maxdim:
        s = maxdim / max(img.size)
        img = img.resize((max(1, int(img.width * s)), max(1, int(img.height * s))),
                         Image.LANCZOS)
    buf = BytesIO()
    img.convert("RGBA").save(buf, format="PNG")
    return buf.getvalue()


# `def` (not `async def`) so FastAPI runs it in its threadpool — texconv/PIL are
# blocking and must not stall the event loop / SSE stream.
@app.get("/api/preview")
def preview(mode: str, kind: str, set_id: int, map_type: str,
            lod: int = -1, maxdim: int = 0):
    try:
        img = _render_preview(mode, kind, set_id, map_type, lod, maxdim)
    except Exception:
        log.exception("preview render failed")
        img = None
    if img is None:
        return Response(status_code=404)
    # Cacheable: the URL carries a nonce (window.__previewNonce) that the
    # frontend bumps whenever the queue changes, so a given URL always maps to
    # fixed content. This makes re-hovering a previously-seen image instant
    # (served from the webview's memory cache, no refetch / re-encode).
    return Response(content=_png_response_bytes(img, maxdim),
                    media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})


@app.post("/api/preview_meta")
async def preview_meta(request: Request):
    """Return {ok, name, type_label, width, height} for an inspector header."""
    d = await request.json()
    if not isinstance(d, dict):
        return {"ok": False}
    mode = d.get("mode"); kind = d.get("kind")
    set_id = int(d.get("set_id", -1)); map_type = d.get("map_type", "")
    lod = int(d.get("lod", -1))

    name = ""; type_label = ""; w = 0; h = 0
    try:
        if mode == "pack":
            ts = _sets.get(set_id)
            if ts is None:
                return {"ok": False}
            if kind == "input":
                p = _pack_input_path(ts, map_type)
                if p is None:
                    return {"ok": False}
                name = p.name
                type_label = _PACK_INPUT_LABEL.get(map_type, map_type.title())
                with Image.open(p) as im:
                    w, h = im.size
            else:
                lod0 = max(0, lod)
                name = packer_mod.dds_output_path(Path("."), ts.base_name, map_type, lod0).name
                type_label = _PACK_OUTPUT_LABEL.get(map_type, map_type.upper() + ".DDS")
                w, h = packer_mod.reference_size(ts)
        else:
            us = _unpack_sets.get(set_id)
            if us is None:
                return {"ok": False}
            if kind == "input":
                f = _find_dds(us, map_type, lod)
                if f is None:
                    return {"ok": False}
                name = f.path.name
                type_label = f"{map_type.upper()} DDS"
                im = _decode_dds_cached(f.path)
                if im is not None:
                    w, h = im.size
            else:
                src_mt = unpacker_mod.PNG_TYPE_TO_DDS.get(map_type)
                f = _find_dds(us, src_mt, lod)
                if f is None:
                    return {"ok": False}
                token = unpacker_mod.PNG_TYPE_FILE_TOKEN.get(map_type, map_type)
                name = f"{us.base_name}_{token}_{f.lod}.png"
                type_label = _PNG_OUTPUT_LABEL.get(map_type, map_type.upper() + ".PNG")
                im = _decode_dds_cached(f.path)
                if im is not None:
                    w, h = im.size
    except Exception:
        log.exception("preview_meta failed")
        return {"ok": False}

    return {"ok": True, "name": name, "type_label": type_label, "width": w, "height": h}


# ─── No-op stubs for Tauri-handled methods ────────────────────────────────────
# These are handled by Tauri Rust commands. The stubs exist so any stray
# fetch call doesn't 404.

@app.post("/api/notify_ready")
async def notify_ready():
    return None

@app.post("/api/pick_files")
async def pick_files_stub():
    return []

@app.post("/api/pick_folder")
async def pick_folder_stub():
    return ""

@app.post("/api/pick_scan_folder")
async def pick_scan_folder_stub():
    return ""

@app.post("/api/pick_dds_files")
async def pick_dds_files_stub():
    return []

@app.post("/api/open_folder")
async def open_folder_stub():
    return False


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import socket

    # Use a fixed port so Tauri doesn't need to read stdout at all.
    # Fall back to a random port only if the fixed one is already taken.
    FIXED_PORT = 45291

    try:
        _write_debug_log("Imports OK — selecting port...")

        def _port_free(p: int) -> bool:
            try:
                with socket.socket() as s:
                    s.bind(("127.0.0.1", p))
                return True
            except OSError:
                return False

        port = FIXED_PORT if _port_free(FIXED_PORT) else 0
        if port == 0:
            with socket.socket() as s:
                s.bind(("127.0.0.1", 0))
                port = s.getsockname()[1]

        _write_debug_log(f"Port selected: {port}")

        # Still write PORT= to stdout as a signal (belt-and-suspenders)
        sys.stdout.write(f"PORT={port}\n")
        sys.stdout.flush()
        _write_debug_log(f"PORT={port} written to stdout — starting uvicorn")

        uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
        _write_debug_log("uvicorn exited normally")
    except Exception:
        _write_debug_log("CRASH:\n" + traceback.format_exc())
