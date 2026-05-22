"""Texture set scanner + channel packer.

`scan_paths` walks files / folders, identifies each PNG by filename suffix,
and groups them into TextureSet objects (one per base name).

`apply_packed_pbr_postprocess` is the critical step that *always runs on
both folder scans AND loose-file drops* — it converts _rm / _orm packed maps
into the per-channel data the encoder expects.

`build_packed_*` produce final PIL.Image objects (RGBA or L) at a target size,
ready for the encoder to write to disk and feed texconv.exe.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image

from config import (
    AVAILABLE_LODS,
    LOD0_SIZE_AS_INPUT,
    LOD0_SIZE_OPTIONS,
    MANDATORY_LOD,
    SEPARATORS,
    SUFFIX_MAP,
    MapType,
    TextureSet,
    lod_scale,
)

log = logging.getLogger(__name__)


# ─── Suffix detection ────────────────────────────────────────────────────────

_TRIM_RE = re.compile(r"[._\-]+$")


def detect_suffix(stem: str) -> tuple[str, MapType | None]:
    """Return (base_name, map_type) where base_name is `stem` minus the
    detected suffix and any trailing separator. If no suffix matches, return
    (stem, None)."""
    low = stem.lower()
    for suf, mt in SUFFIX_MAP:
        for sep in SEPARATORS:
            tag = sep + suf
            if low.endswith(tag):
                base = stem[: -len(tag)]
                return _TRIM_RE.sub("", base), mt
        if low.endswith(suf) and len(stem) > len(suf):
            # tolerate the no-separator form too (rare; e.g. "wallnorm.png")
            base = stem[: -len(suf)]
            if _TRIM_RE.search(base) or base[-1].isdigit():
                return _TRIM_RE.sub("", base), mt
    return stem, None


# ─── Scan ────────────────────────────────────────────────────────────────────

def scan_paths(paths: Iterable[Path]) -> list[TextureSet]:
    """Walk the given paths (files + folders), bucket PNGs into TextureSets."""
    pngs = _expand_to_pngs(paths)
    by_base: dict[str, TextureSet] = {}
    for p in pngs:
        base, mt = detect_suffix(p.stem)
        if mt is None:
            # Heuristic: treat as diffuse so a single _color.png drop still produces output
            base, mt = p.stem, MapType.DIFF
        # Group by base name *and* parent folder so two unrelated "wall" sets in
        # different folders don't collide.
        key = f"{p.parent.as_posix()}::{base}"
        ts = by_base.setdefault(key, TextureSet(base_name=base))
        _assign(ts, mt, p)

    sets = list(by_base.values())
    apply_packed_pbr_postprocess(sets)
    return sets


SUPPORTED_IMAGE_EXTS: tuple[str, ...] = (
    ".png", ".jpg", ".jpeg", ".bmp", ".tga", ".tif", ".tiff", ".webp",
)


def _expand_to_pngs(paths: Iterable[Path]) -> list[Path]:
    """Walk file/folder paths, return every supported-format image found.

    The name is historic — this actually accepts any PIL-loadable image type
    (see SUPPORTED_IMAGE_EXTS). Other modules import it under this name.
    """
    out: list[Path] = []
    seen: set[Path] = set()
    for p in paths:
        if p.is_dir():
            for f in sorted(p.rglob("*")):
                if f.is_file() and f.suffix.lower() in SUPPORTED_IMAGE_EXTS:
                    if f not in seen:
                        out.append(f)
                        seen.add(f)
        elif p.is_file() and p.suffix.lower() in SUPPORTED_IMAGE_EXTS:
            if p not in seen:
                out.append(p)
                seen.add(p)
    return out


def _assign(ts: TextureSet, mt: MapType, p: Path) -> None:
    if mt == MapType.DIFF:        ts.diff = p
    elif mt == MapType.OPACITY:   ts.opacity = p
    elif mt == MapType.METAL:     ts.metal = p
    elif mt == MapType.AO:        ts.ao = p
    elif mt == MapType.NORM:      ts.norm = p
    elif mt == MapType.GLOSS:     ts.gloss = p
    elif mt == MapType.ROUGH:     ts.rough = p
    elif mt == MapType.HEIGHT:    ts.height = p
    elif mt == MapType.RM:        ts.rm = p
    elif mt == MapType.ORM:       ts.orm = p


# ─── Packed-PBR post-process ─────────────────────────────────────────────────

def apply_packed_pbr_postprocess(sets: list[TextureSet]) -> None:
    """Resolve _rm / _orm into the channel signals the encoder needs.

    A set with _rm but no _normal also gets `synthetic_flat_normal=True` so
    `build_packed_normal` synthesises an RGB (128, 128, 255) carrier.

    This step is idempotent — safe to call multiple times.
    """
    for ts in sets:
        has_packed = (ts.rm is not None) or (ts.orm is not None)
        if has_packed and ts.norm is None:
            ts.synthetic_flat_normal = True
            ts.warnings.append(
                f"No _normal supplied for {ts.base_name!r}; synthesising flat normal "
                "and packing glossiness from the packed map."
            )


# ─── Image loading helpers ──────────────────────────────────────────────────

def _load_rgba(p: Path) -> Image.Image:
    img = Image.open(p)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    return img


def _load_l(p: Path) -> Image.Image:
    img = Image.open(p)
    if img.mode != "L":
        img = img.convert("L")
    return img


def _resize_l(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    if img.size == size:
        return img
    return img.resize(size, Image.LANCZOS)


def _resize_rgba(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    if img.size == size:
        return img
    return img.resize(size, Image.LANCZOS)


def _new_l(size: tuple[int, int], value: int) -> Image.Image:
    img = Image.new("L", size, value)
    return img


# ─── Pick a reference size for a set ────────────────────────────────────────

def reference_size(ts: TextureSet) -> tuple[int, int]:
    """Choose a size to use as the set's native resolution.

    Prefers diff, then norm, then metal/ao/height/rm/orm.
    """
    for p in (ts.diff, ts.norm if isinstance(ts.norm, Path) else None,
              ts.metal, ts.height, ts.rm, ts.orm, ts.ao):
        if isinstance(p, Path):
            with Image.open(p) as im:
                return im.size
    return (1024, 1024)


def cap_size(native: tuple[int, int], cap: str) -> tuple[int, int]:
    """Apply the LOD0 size cap dropdown."""
    if cap == LOD0_SIZE_AS_INPUT:
        return native
    try:
        c = int(cap)
    except ValueError:
        return native
    w, h = native
    scale = min(c / w, c / h, 1.0)
    return (max(1, int(round(w * scale))), max(1, int(round(h * scale))))


def lod_size(lod0: tuple[int, int], lod: int) -> tuple[int, int]:
    s = lod_scale(lod)
    return (max(1, lod0[0] // s), max(1, lod0[1] // s))


# ─── Channel builders ────────────────────────────────────────────────────────

def build_packed_diffuse(ts: TextureSet, size: tuple[int, int]) -> Image.Image | None:
    """RGB = albedo, A = opacity (1.0 default).

    Returns None if no diffuse source available.
    """
    if ts.diff is None:
        return None
    diff = _resize_rgba(_load_rgba(ts.diff), size)
    r, g, b, diff_a = diff.split()
    if ts.opacity is not None:
        a = _resize_l(_load_l(ts.opacity), size)
    elif diff_a.getextrema()[0] < 255:
        # diff image already has alpha — use it
        a = diff_a
    else:
        a = _new_l(size, 255)
    return Image.merge("RGBA", (r, g, b, a))


def build_packed_metal(ts: TextureSet, size: tuple[int, int]) -> Image.Image | None:
    """RGB = metalness greyscale (linear), A = AO (1.0 default).

    Sources, in priority order:
      _metal grayscale   → R=G=B
      _orm.B replicated
      _rm.B replicated

    AO from:
      _ao
      _orm.R
      else 1.0
    """
    rgb_chan: Image.Image | None = None
    if ts.metal is not None:
        rgb_chan = _resize_l(_load_l(ts.metal), size)
    elif ts.orm is not None:
        _, _, b, _ = _resize_rgba(_load_rgba(ts.orm), size).split()
        rgb_chan = b
    elif ts.rm is not None:
        _, _, b, _ = _resize_rgba(_load_rgba(ts.rm), size).split()
        rgb_chan = b

    if rgb_chan is None:
        return None

    if ts.ao is not None:
        a_chan = _resize_l(_load_l(ts.ao), size)
    elif ts.orm is not None:
        r, _, _, _ = _resize_rgba(_load_rgba(ts.orm), size).split()
        a_chan = r
    else:
        a_chan = _new_l(size, 255)

    return Image.merge("RGBA", (rgb_chan, rgb_chan, rgb_chan, a_chan))


def build_packed_normal(ts: TextureSet, size: tuple[int, int]) -> Image.Image | None:
    """RGB = DirectX tangent normal, A = glossiness (= 1 − roughness).

    If no normal source and no synthetic flag → return None (set has no normal data).
    """
    if isinstance(ts.norm, Path):
        rgb_img = _resize_rgba(_load_rgba(ts.norm), size).convert("RGB")
    elif ts.synthetic_flat_normal:
        rgb_img = Image.new("RGB", size, (128, 128, 255))
    else:
        # Last-resort synthetic if any gloss/rough data exists
        if ts.gloss is not None or ts.rough is not None or ts.rm is not None or ts.orm is not None:
            rgb_img = Image.new("RGB", size, (128, 128, 255))
        else:
            return None

    r, g, b = rgb_img.split()

    # Glossiness alpha
    if ts.gloss is not None:
        a_chan = _resize_l(_load_l(ts.gloss), size)
    elif ts.rough is not None:
        rough = _resize_l(_load_l(ts.rough), size)
        a_chan = _invert(rough)
    elif ts.rm is not None:
        _, g_rough, _, _ = _resize_rgba(_load_rgba(ts.rm), size).split()
        a_chan = _invert(g_rough)
    elif ts.orm is not None:
        _, g_rough, _, _ = _resize_rgba(_load_rgba(ts.orm), size).split()
        a_chan = _invert(g_rough)
    else:
        a_chan = _new_l(size, 255)

    return Image.merge("RGBA", (r, g, b, a_chan))


def build_packed_height(ts: TextureSet, size: tuple[int, int]) -> Image.Image | None:
    """Grayscale displacement. Returns None if no height map."""
    if ts.height is None:
        return None
    return _resize_l(_load_l(ts.height), size)


def _invert(img_l: Image.Image) -> Image.Image:
    """Channel-wise invert of an 'L' image — returns 255 − pixel."""
    from PIL import ImageChops
    return ImageChops.invert(img_l)


# ─── Output naming ───────────────────────────────────────────────────────────

DDS_SUFFIXES = {
    "diff": "diff",
    "metal": "metal",
    "norm": "norm",
    "height": "height",
}


def dds_output_path(out_dir: Path, set_name: str, map_type: str, lod: int) -> Path:
    """out_dir/<set>_<map>_<lod>.dds"""
    return out_dir / f"{set_name}_{DDS_SUFFIXES[map_type]}_{lod}.dds"


# ─── Per-set channel-map plan ────────────────────────────────────────────────

@dataclass
class SetPlan:
    """What to encode for a given TextureSet — calculated once per set."""
    ts: TextureSet
    lod0_native: tuple[int, int]    # uncapped native LOD0
    lod0: tuple[int, int]            # capped LOD0
    selected_lods: list[int]
    out_dir: Path
    fast_mode: bool
    maps_to_write: list[str]        # subset of {"diff","metal","norm","height"}


def plan_set(ts: TextureSet, *, lod0_cap: str, selected_lods: Iterable[int],
             fast_mode: bool, out_dir: Path) -> SetPlan:
    native = reference_size(ts)
    lod0 = cap_size(native, lod0_cap)

    maps: list[str] = []
    if ts.diff is not None:
        maps.append("diff")
    if (ts.metal is not None) or (ts.orm is not None) or (ts.rm is not None):
        maps.append("metal")
    if (isinstance(ts.norm, Path) or ts.synthetic_flat_normal
            or ts.gloss is not None or ts.rough is not None
            or ts.rm is not None or ts.orm is not None):
        maps.append("norm")
    if ts.height is not None:
        maps.append("height")

    lods_set = {MANDATORY_LOD, *selected_lods} & set(AVAILABLE_LODS)
    return SetPlan(
        ts=ts,
        lod0_native=native,
        lod0=lod0,
        selected_lods=sorted(lods_set),
        out_dir=out_dir,
        fast_mode=fast_mode,
        maps_to_write=maps,
    )


def build_map_at_lod(ts: TextureSet, map_type: str, size: tuple[int, int]) -> Image.Image | None:
    if map_type == "diff":   return build_packed_diffuse(ts, size)
    if map_type == "metal":  return build_packed_metal(ts, size)
    if map_type == "norm":   return build_packed_normal(ts, size)
    if map_type == "height": return build_packed_height(ts, size)
    raise ValueError(f"unknown map_type {map_type!r}")


# ─── Parallel orchestrator ──────────────────────────────────────────────────

import shutil
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Callable

from events import ProgressEvent


def convert_sets_parallel(
    sets: list[TextureSet],
    *,
    lod0_cap: str,
    selected_lods: list[int],
    fast_mode: bool,
    out_root: Path,
    same_as_input: bool,
    cap: int,
    push_event: Callable[[ProgressEvent], None],
    set_ids: dict[int, int] | None = None,
) -> None:
    """Encode every set in parallel; stream ProgressEvents through `push_event`.

    Blocks until all jobs complete; intended to be called from a daemon thread
    so the Tk main loop stays responsive (the worker pool itself parallelises
    sets, but this function as a whole still blocks its caller).
    """
    if set_ids is None:
        set_ids = {id(ts): i for i, ts in enumerate(sets)}

    workers = max(1, min(cap, len(sets)))
    log.info("converting %d sets with %d worker(s); fast=%s lods=%s cap=%s",
             len(sets), workers, fast_mode, selected_lods, lod0_cap)

    with ThreadPoolExecutor(max_workers=workers) as pool:
        for i, ts in enumerate(sets):
            sid = set_ids[id(ts)]
            push_event(ProgressEvent(set_id=sid, status="queued", label="WAITING IN QUEUE"))
            pool.submit(
                _convert_one_set,
                ts, sid, lod0_cap, list(selected_lods), fast_mode, out_root,
                same_as_input, push_event,
            )


def _convert_one_set(
    ts: TextureSet, set_id: int, lod0_cap: str,
    selected_lods: list[int], fast_mode: bool,
    out_root: Path, same_as_input: bool,
    push_event: Callable[[ProgressEvent], None],
) -> None:
    """Worker body — runs one set's encode pipeline."""
    # Import locally so worker can't accidentally touch Tk.
    from encoder import encode_dds  # type: ignore

    try:
        plan = plan_set(ts, lod0_cap=lod0_cap, selected_lods=selected_lods,
                        fast_mode=fast_mode, out_dir=Path("."))
        push_event(ProgressEvent(set_id=set_id, status="reading", pct=2,
                                 label="READING PNGS"))

        # Output directory.
        # Resolution priority:
        #   1. same_as_input + primary file is on a REAL disk path -> next to source
        #   2. configured output_dir -> use it
        #   3. last resort -> %USERPROFILE%\Documents\AnnoDDSPacker
        import tempfile as _tf
        TEMP_ROOT = Path(_tf.gettempdir()).resolve()
        def _is_temp(p: Path) -> bool:
            try:
                rp = p.resolve()
                return rp == TEMP_ROOT or TEMP_ROOT in rp.parents
            except OSError:
                return False

        DEFAULT_FALLBACK = Path.home() / "Documents" / "AnnoDDSPacker"

        primary = ts.primary_thumbnail_source()
        primary_is_real = primary is not None and not _is_temp(primary)
        out_root_provided = (
            out_root is not None
            and str(out_root)
            and Path(out_root).is_absolute()
        )

        if same_as_input and primary_is_real:
            # Real disk path (from Pick Folder/Pick Files) → write next to
            # the source. This is the true "Same as input folder" behaviour.
            base_out = primary.parent
        elif same_as_input and primary is not None and _is_temp(primary):
            # HTML5 drag-drop with same-as-input: original disk paths are
            # unrecoverable (Chromium hides them). Write FLAT into the
            # configured output root. No more "subdir per dropped folder"
            # confusion. If no real out_root is set, fall back to Documents.
            if out_root_provided and not _is_temp(Path(out_root)):
                base_out = Path(out_root)
            else:
                base_out = DEFAULT_FALLBACK
        elif out_root_provided:
            base_out = Path(out_root)
        else:
            base_out = DEFAULT_FALLBACK

        base_out.mkdir(parents=True, exist_ok=True)
        log.info("[output] set=%s -> %s", ts.base_name, base_out)

        total_jobs = max(1, len(plan.selected_lods) * max(1, len(plan.maps_to_write)))
        done_jobs = 0
        t0 = time.monotonic()
        maps_done_overall: set[str] = set()

        push_event(ProgressEvent(set_id=set_id, status="packing", pct=8,
                                 label="PACKING CHANNELS"))

        with tempfile.TemporaryDirectory(prefix=f"ddspack_{ts.base_name}_") as tmpd:
            tmp = Path(tmpd)
            for lod in plan.selected_lods:
                lod_size_ = lod_size(plan.lod0, lod)
                push_event(ProgressEvent(
                    set_id=set_id, status="encoding",
                    pct=8 + (done_jobs / total_jobs) * 87,
                    label=f"ENCODING LOD{lod}",
                ))

                for map_type in plan.maps_to_write:
                    img = build_map_at_lod(ts, map_type, lod_size_)
                    if img is None:
                        done_jobs += 1
                        continue
                    tmp_png = tmp / f"{ts.base_name}_{map_type}_{lod}.png"
                    if img.mode == "RGBA":
                        img.save(tmp_png)
                    elif img.mode == "L":
                        img.save(tmp_png)
                    else:
                        img.convert("RGBA").save(tmp_png)

                    dst_dds = dds_output_path(base_out, ts.base_name, map_type, lod)
                    encode_dds(tmp_png, dst_dds, fast=fast_mode)

                    done_jobs += 1
                    maps_done_overall.add(map_type)
                    elapsed = time.monotonic() - t0
                    rate = elapsed / max(1, done_jobs)
                    eta = max(0.0, rate * (total_jobs - done_jobs))
                    pct = 8 + (done_jobs / total_jobs) * 87
                    push_event(ProgressEvent(
                        set_id=set_id, status="encoding",
                        pct=pct,
                        label=f"ENCODING LOD{lod}",
                        eta_s=eta,
                        maps_done=tuple(maps_done_overall),
                    ))

        push_event(ProgressEvent(
            set_id=set_id, status="done", pct=100,
            label="COMPLETED",
            maps_done=tuple(maps_done_overall),
            output_dir=str(base_out),
        ))
    except Exception as ex:
        log.exception("set %s (%s) failed", set_id, ts.base_name)
        push_event(ProgressEvent(
            set_id=set_id, status="error", pct=0,
            label="ERROR", error=str(ex),
        ))
