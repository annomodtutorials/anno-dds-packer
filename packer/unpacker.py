"""DDS -> PNG unpacker -- the reverse of packer.py.

Reads Anno-named DDS files (e.g. wall_diff_0.dds, wall_norm_0.dds),
decodes each to a temporary RGBA PNG via texconv, then splits the RGBA
channels back out according to Anno's packing convention:

  diff.dds   -> {base}_diffuse_{lod}.png  (RGB = Albedo sRGB)
                {base}_opacity_{lod}.png  (A, only if not fully opaque)
  norm.dds   -> {base}_normal_{lod}.png   (RGB = DirectX tangent normal)
                {base}_gloss_{lod}.png    (A = Glossiness, only if non-trivial)
  metal.dds  -> {base}_metal_{lod}.png    (R = Metalness, grayscale)
                {base}_ao_{lod}.png       (A = Ambient Occlusion)
  height.dds -> {base}_height_{lod}.png   (R = Displacement, grayscale)
"""
from __future__ import annotations

import logging
import re
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from PIL import Image

from config import PARALLEL_DEFAULT_CAP, TEXCONV_EXE
from events import ProgressEvent

log = logging.getLogger(__name__)

# Matches Anno-standard DDS output names: wall_diff_0.dds, marble_metal_2.dds
_DDS_ANNO_PATTERN = re.compile(
    r'^(.+?)_(diff|norm|metal|height|mask)_(\d+)\.dds$', re.IGNORECASE
)

# Display order for DDS map types in UI
_DDS_ORDER = ("diff", "norm", "metal", "height", "mask")

# PNG types produced per DDS map type (upper bound shown in UI)
_PNG_TYPES_BY_DDS: dict[str, list[str]] = {
    "diff":   ["diffuse", "opacity"],
    "norm":   ["normal",  "rough"],
    "metal":  ["metal",   "ao"],
    "height": ["height"],
    "mask":   ["emission", "mask_alpha"],
}

# Reverse map: which source DDS a given unpacked PNG channel comes from.
PNG_TYPE_TO_DDS: dict[str, str] = {
    "diffuse": "diff", "opacity": "diff",
    "normal": "norm", "rough": "norm",
    "metal": "metal", "ao": "metal",
    "height": "height",
    "emission": "mask", "mask_alpha": "mask",
}

# Filename token used for each unpacked PNG type (matches _split_channels output).
PNG_TYPE_FILE_TOKEN: dict[str, str] = {
    "diffuse": "diffuse", "opacity": "opacity",
    "normal": "normal", "rough": "roughness",
    "metal": "metal", "ao": "ao",
    "height": "height",
    "emission": "emission", "mask_alpha": "mask_alpha",
}


def extract_channel_image(img: Image.Image, png_type: str) -> Image.Image | None:
    """Return an in-memory PIL image for a single unpacked channel type.

    Mirrors the per-channel math in _split_channels (including the DirectX→OpenGL
    normal conversion) but returns the image instead of writing it to disk.
    Used by the preview/inspector endpoints.
    """
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    R, G, B, A = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    if png_type in ("diffuse", "emission"):
        return Image.fromarray(arr[:, :, :3], "RGB")
    if png_type in ("opacity", "ao", "mask_alpha"):
        return Image.fromarray(A, "L")
    if png_type in ("metal", "height"):
        return Image.fromarray(R, "L")
    if png_type == "rough":
        return Image.fromarray((255 - A).astype(np.uint8), "L")
    if png_type == "normal":
        x = R.astype(np.float32) / 127.5 - 1.0
        y_ogl = -(G.astype(np.float32) / 127.5 - 1.0)   # flip green (DX → OpenGL)
        z = np.sqrt(np.clip(1.0 - x * x - y_ogl * y_ogl, 0.0, 1.0))
        r_out = np.clip((x + 1.0) * 127.5, 0, 255).astype(np.uint8)
        g_out = np.clip((y_ogl + 1.0) * 127.5, 0, 255).astype(np.uint8)
        b_out = np.clip(z * 255.0, 0, 255).astype(np.uint8)
        return Image.fromarray(np.stack([r_out, g_out, b_out], axis=2), "RGB")
    return None


@dataclass
class DdsFile:
    path: Path
    map_type: str   # "diff" | "norm" | "metal" | "height"
    lod: int


@dataclass
class UnpackSet:
    base_name: str
    files: list[DdsFile] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def primary_path(self) -> Path | None:
        return self.files[0].path if self.files else None

    def map_types_ordered(self) -> list[str]:
        seen: dict[str, bool] = {}
        for f in self.files:
            seen[f.map_type] = True
        return [t for t in _DDS_ORDER if t in seen]

    def output_png_types(self) -> list[str]:
        """Upper-bound list of PNG types this set will produce (for UI display)."""
        out: list[str] = []
        for mt in self.map_types_ordered():
            out.extend(_PNG_TYPES_BY_DDS.get(mt, []))
        return out


# ---------------------------------------------------------------------------
# Scanning
# ---------------------------------------------------------------------------

def scan_dds_paths(paths: list[Path]) -> list[UnpackSet]:
    """Scan files / folders for Anno-named DDS files; return grouped UnpackSets."""
    all_dds: list[Path] = []
    for p in paths:
        if p.is_dir():
            for f in sorted(p.rglob("*.dds")):
                all_dds.append(f)
        elif p.is_file() and p.suffix.lower() == ".dds":
            all_dds.append(p)

    sets: dict[tuple[str, str], UnpackSet] = {}
    for f in all_dds:
        m = _DDS_ANNO_PATTERN.match(f.name)
        if not m:
            continue
        base = m.group(1)
        map_type = m.group(2).lower()
        lod = int(m.group(3))
        key = (str(f.parent), base)
        if key not in sets:
            sets[key] = UnpackSet(base_name=base)
        sets[key].files.append(DdsFile(path=f, map_type=map_type, lod=lod))

    return list(sets.values())


# ---------------------------------------------------------------------------
# Decode + channel split
# ---------------------------------------------------------------------------

def _texconv_to_png(dds_path: Path, out_dir: Path) -> Path | None:
    """Invoke texconv to decode one DDS -> PNG. Returns the PNG path or None."""
    cmd = [
        str(TEXCONV_EXE),
        "-ft", "png",
        "-o", str(out_dir),
        "-y",
        str(dds_path),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            log.warning("texconv failed (%s): %s", dds_path.name,
                        result.stderr[:200])
            return None
    except (subprocess.TimeoutExpired, OSError) as exc:
        log.warning("texconv error for %s: %s", dds_path.name, exc)
        return None

    out_png = out_dir / (dds_path.stem + ".png")
    if not out_png.exists():
        # texconv may lowercase the stem; try a glob fallback
        candidates = list(out_dir.glob(f"{dds_path.stem}*.png"))
        return candidates[0] if candidates else None
    return out_png


def _split_channels(
    rgba_png: Path,
    map_type: str,
    base: str,
    lod: int,
    out_dir: Path,
) -> list[tuple[Path, str]]:
    """Split an RGBA PNG into per-channel images per Anno's convention.

    Returns a list of (path, type_name) tuples where type_name is the
    short PNG type string (e.g. "diffuse", "ao") used for UI tracking.
    """
    img = Image.open(rgba_png).convert("RGBA")
    arr = np.array(img, dtype=np.uint8)
    R, G, B, A = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    outputs: list[tuple[Path, str]] = []

    if map_type == "diff":
        # RGB = sRGB Albedo
        rgb = Image.fromarray(arr[:, :, :3], "RGB")
        p = out_dir / f"{base}_diffuse_{lod}.png"
        rgb.save(str(p))
        outputs.append((p, "diffuse"))
        # A = Opacity -- skip when fully opaque (keeps folder tidy)
        if int(A.min()) < 250:
            a_img = Image.fromarray(A, "L")
            p2 = out_dir / f"{base}_opacity_{lod}.png"
            a_img.save(str(p2))
            outputs.append((p2, "opacity"))

    elif map_type == "norm":
        # Anno stores DirectX tangent normals (R=X, G=Y-down, A=Glossiness).
        # Convert to OpenGL (Y-up) for Blender / Maya:
        #   • Flip the green channel  (Y-down → Y-up)
        #   • Reconstruct the blue/Z channel from XY — Anno DDS may leave B=0
        #     because the shader computes it; we always derive a clean Z so the
        #     PNG is immediately usable without any manual channel work.
        x = R.astype(np.float32) / 127.5 - 1.0        # X  in [-1, 1]
        y_dx = G.astype(np.float32) / 127.5 - 1.0     # Y  DirectX
        y_ogl = -y_dx                                  # Y  OpenGL (flip)
        z = np.sqrt(np.clip(1.0 - x * x - y_ogl * y_ogl, 0.0, 1.0))

        r_out = np.clip((x + 1.0) * 127.5, 0, 255).astype(np.uint8)
        g_out = np.clip((y_ogl + 1.0) * 127.5, 0, 255).astype(np.uint8)
        b_out = np.clip(z * 255.0, 0, 255).astype(np.uint8)

        rgb = Image.fromarray(np.stack([r_out, g_out, b_out], axis=2), "RGB")
        p = out_dir / f"{base}_normal_{lod}.png"
        rgb.save(str(p))
        outputs.append((p, "normal"))
        # A = Glossiness (Anno packs 1 - roughness in the alpha)
        # Invert to get Roughness; skip if trivially uniform (no real data encoded)
        if int(A.max()) - int(A.min()) > 4:
            rough = (255 - A).astype(np.uint8)
            r_img = Image.fromarray(rough, "L")
            p2 = out_dir / f"{base}_roughness_{lod}.png"
            r_img.save(str(p2))
            outputs.append((p2, "rough"))

    elif map_type == "metal":
        # RGB = Metalness (grayscale, replicated across channels -- use R)
        m_img = Image.fromarray(R, "L")
        p = out_dir / f"{base}_metal_{lod}.png"
        m_img.save(str(p))
        outputs.append((p, "metal"))
        # A = Ambient Occlusion
        a_img = Image.fromarray(A, "L")
        p2 = out_dir / f"{base}_ao_{lod}.png"
        a_img.save(str(p2))
        outputs.append((p2, "ao"))

    elif map_type == "height":
        # R = Grayscale displacement
        h_img = Image.fromarray(R, "L")
        p = out_dir / f"{base}_height_{lod}.png"
        h_img.save(str(p))
        outputs.append((p, "height"))

    elif map_type == "mask":
        # RGB = emission/night-glow mask
        rgb = Image.fromarray(arr[:, :, :3], "RGB")
        p = out_dir / f"{base}_emission_{lod}.png"
        rgb.save(str(p))
        outputs.append((p, "emission"))
        # A = secondary night mask
        a_img = Image.fromarray(A, "L")
        p2 = out_dir / f"{base}_mask_alpha_{lod}.png"
        a_img.save(str(p2))
        outputs.append((p2, "mask_alpha"))

    return outputs


# ---------------------------------------------------------------------------
# Worker
# ---------------------------------------------------------------------------

def _unpack_one(
    set_id: int,
    us: UnpackSet,
    out_root: Path,
    same_as_input: bool,
    push_event,
) -> None:
    """Unpack one UnpackSet, pushing ProgressEvents throughout."""
    total = len(us.files)
    if total == 0:
        push_event(ProgressEvent(set_id=set_id, status="done", pct=100.0,
                                 label="NOTHING TO DO"))
        return

    push_event(ProgressEvent(set_id=set_id, status="reading", pct=0.0,
                             label="READING DDS", maps_done=()))

    done_types: list[str] = []
    final_out_dir: str = ""

    for i, dds_file in enumerate(us.files):
        pct_start = (i / total) * 90.0
        push_event(ProgressEvent(
            set_id=set_id,
            status="encoding",
            pct=pct_start,
            label=f"DECODING {dds_file.map_type.upper()} LOD{dds_file.lod}",
            maps_done=tuple(done_types),
        ))

        if same_as_input:
            out_dir = dds_file.path.parent
        else:
            out_dir = out_root
        out_dir.mkdir(parents=True, exist_ok=True)
        final_out_dir = str(out_dir)

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp_png = _texconv_to_png(dds_file.path, Path(tmpdir))
                if tmp_png is None:
                    us.warnings.append(f"texconv failed: {dds_file.path.name}")
                    continue
                pairs = _split_channels(
                    tmp_png, dds_file.map_type,
                    us.base_name, dds_file.lod, out_dir,
                )
                done_types.extend(type_name for _, type_name in pairs)
        except Exception as exc:
            log.warning("unpack error for %s: %s", dds_file.path.name, exc)
            us.warnings.append(f"{dds_file.path.name}: {exc}")

    push_event(ProgressEvent(
        set_id=set_id,
        status="done",
        pct=100.0,
        label="UNPACKED",
        maps_done=tuple(done_types),
        output_dir=final_out_dir,
    ))


# ---------------------------------------------------------------------------
# Parallel entry point
# ---------------------------------------------------------------------------

def unpack_sets_parallel(
    items: list[tuple[int, UnpackSet]],
    out_root: Path,
    same_as_input: bool,
    cap: int,
    push_event,
) -> None:
    """Unpack multiple UnpackSets concurrently (up to `cap` workers)."""
    workers = max(1, min(cap, PARALLEL_DEFAULT_CAP))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [
            pool.submit(_unpack_one, sid, us, out_root, same_as_input, push_event)
            for sid, us in items
        ]
        for fut in futs:
            try:
                fut.result()
            except Exception as exc:
                log.exception("unpack worker raised: %s", exc)
