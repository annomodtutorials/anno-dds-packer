"""DDS encoding via texconv.exe + DXGI header patch (BC7_UNORM 99 → BC7_TYPELESS 98).

texconv is bundled in tools/texconv.exe (MIT, Microsoft DirectXTex). It produces
BC7-compressed DDS with a full mip chain by default. The default codepath uses
the GPU (DirectCompute) — never pass -nogpu unless explicitly debugging.

The game expects the DXGI format byte at offset 0x80 to be 98 (BC7_TYPELESS).
texconv writes 99 (BC7_UNORM); we byte-patch post-encode.
"""
from __future__ import annotations

import logging
import struct
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image

from config import (
    DDS_DXGI_BC7_TYPELESS,
    DDS_DXGI_BC7_UNORM,
    DDS_DXGI_FORMAT_OFFSET,
    TEXCONV_EXE,
)

log = logging.getLogger(__name__)


class EncodeError(RuntimeError):
    pass


# ─── Encode one DDS ─────────────────────────────────────────────────────────

def encode_dds(src_png: Path, dst_dds: Path, *, fast: bool = False,
               full_mips: bool = True, gpu: bool = True) -> None:
    """Encode src_png to BC7 DDS at dst_dds. Patches DXGI format to BC7_TYPELESS.

    Raises EncodeError on texconv failure.
    """
    if not TEXCONV_EXE.exists():
        raise EncodeError(f"texconv.exe not found at {TEXCONV_EXE}")
    if not src_png.exists():
        raise EncodeError(f"input PNG not found: {src_png}")
    dst_dds.parent.mkdir(parents=True, exist_ok=True)

    # texconv writes <out_dir>/<input_basename>.dds. To get the exact dst_dds
    # filename, we either (a) make sure the input PNG has the matching basename,
    # or (b) rename after. (a) is simpler and avoids tmp-PNG collisions.
    target_name = dst_dds.stem  # without ".dds"
    if src_png.stem != target_name:
        # Make a stable copy with the right stem
        relink = src_png.parent / f"{target_name}.png"
        if relink != src_png:
            # Note: caller is expected to write a tmp PNG with the target stem
            # to begin with; this rename is a safety fallback.
            relink.write_bytes(src_png.read_bytes())
            src_for_cmd = relink
        else:
            src_for_cmd = src_png
    else:
        src_for_cmd = src_png

    args: list[str] = [
        str(TEXCONV_EXE),
        "-f", "BC7_UNORM",
        "-y",
        "-o", str(dst_dds.parent),
    ]
    if fast:
        args += ["-bc", "q"]
    if full_mips:
        args += ["-m", "0"]   # all mips down to 1×1
    if not gpu:
        args += ["-nogpu"]
    args.append(str(src_for_cmd))

    log.debug("texconv: %s", " ".join(args))
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=120,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.TimeoutExpired) as e:
        raise EncodeError(f"texconv invocation failed: {e}") from e

    if p.returncode != 0:
        raise EncodeError(
            f"texconv exited {p.returncode}\n--- stdout ---\n{p.stdout}\n--- stderr ---\n{p.stderr}"
        )
    if not dst_dds.exists():
        raise EncodeError(f"texconv reported success but {dst_dds} does not exist\n"
                          f"--- stdout ---\n{p.stdout}")

    patch_dxgi_format_98(dst_dds)


# ─── Icon encoder (BC7_UNORM_SRGB, no header patch) ────────────────────────

def encode_dds_icon(src_png: Path, dst_dds: Path, *, fast: bool = False,
                    full_mips: bool = True, gpu: bool = True) -> None:
    """Encode src_png as BC7_UNORM_SRGB (DXGI 99) for Anno UI icon textures.

    Identical to encode_dds except:
    - Uses ``-f BC7_UNORM_SRGB -srgb`` so texconv treats the (already sRGB) PNG
      as sRGB on both input and output. Without ``-srgb`` texconv assumes a
      linear input and applies a second linear→sRGB encode — that double gamma
      is what washes icons out.
    - Forces ``-dx10`` so the BC7_UNORM_SRGB tag (DXGI 99) is written in the
      extended header.
    - Does NOT call patch_dxgi_format_98 — patching to 98 (BC7_UNORM/TYPELESS)
      strips the sRGB tag and the game would read the icon as linear (= washed).
      Icons must stay at DXGI 99 (BC7_UNORM_SRGB).

    Raises EncodeError on texconv failure.
    """
    if not TEXCONV_EXE.exists():
        raise EncodeError(f"texconv.exe not found at {TEXCONV_EXE}")
    if not src_png.exists():
        raise EncodeError(f"input PNG not found: {src_png}")
    dst_dds.parent.mkdir(parents=True, exist_ok=True)

    target_name = dst_dds.stem
    if src_png.stem != target_name:
        relink = src_png.parent / f"{target_name}.png"
        if relink != src_png:
            relink.write_bytes(src_png.read_bytes())
            src_for_cmd = relink
        else:
            src_for_cmd = src_png
    else:
        src_for_cmd = src_png

    args: list[str] = [
        str(TEXCONV_EXE),
        "-f", "BC7_UNORM_SRGB",
        "-srgb",      # input & output are sRGB — prevents the double-gamma washout
        "-dx10",      # force DX10 header so the BC7_UNORM_SRGB (DXGI 99) tag is written
        "-y",
        "-o", str(dst_dds.parent),
    ]
    if fast:
        args += ["-bc", "q"]
    if full_mips:
        args += ["-m", "0"]
    if not gpu:
        args += ["-nogpu"]
    args.append(str(src_for_cmd))

    log.debug("texconv (icon): %s", " ".join(args))
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=120,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.TimeoutExpired) as e:
        raise EncodeError(f"texconv invocation failed: {e}") from e

    if p.returncode != 0:
        raise EncodeError(
            f"texconv exited {p.returncode}\n--- stdout ---\n{p.stdout}\n--- stderr ---\n{p.stderr}"
        )
    if not dst_dds.exists():
        raise EncodeError(f"texconv reported success but {dst_dds} does not exist\n"
                          f"--- stdout ---\n{p.stdout}")
    # No patch — icon DDS stays at DXGI 99 (BC7_UNORM_SRGB).


# ─── DXGI header patch ───────────────────────────────────────────────────────

def patch_dxgi_format_98(dds_path: Path) -> None:
    """Rewrite the DXT10 header's dxgiFormat field (offset 0x80) from
    99 (BC7_UNORM) to 98 (BC7_TYPELESS), matching the format Anno 117 ships.

    No-op if the field is already 98. Raises EncodeError on any other value
    (defensive — saves silent corruption if texconv ever changes default).
    """
    with dds_path.open("r+b") as fh:
        fh.seek(DDS_DXGI_FORMAT_OFFSET)
        raw = fh.read(4)
        if len(raw) != 4:
            raise EncodeError(f"{dds_path.name}: too short to read DXGI field")
        cur = struct.unpack("<I", raw)[0]
        if cur == DDS_DXGI_BC7_TYPELESS:
            return  # already patched
        if cur != DDS_DXGI_BC7_UNORM:
            raise EncodeError(
                f"{dds_path.name}: unexpected DXGI format {cur} at offset "
                f"0x{DDS_DXGI_FORMAT_OFFSET:X}; expected {DDS_DXGI_BC7_UNORM} (BC7_UNORM)"
            )
        fh.seek(DDS_DXGI_FORMAT_OFFSET)
        fh.write(struct.pack("<I", DDS_DXGI_BC7_TYPELESS))


def read_dxgi_format(dds_path: Path) -> int:
    """Read the DXGI format byte at offset 0x80. Useful for tests / probing."""
    with dds_path.open("rb") as fh:
        fh.seek(DDS_DXGI_FORMAT_OFFSET)
        raw = fh.read(4)
        return struct.unpack("<I", raw)[0]


# ─── Quick health check ─────────────────────────────────────────────────────

def texconv_available() -> bool:
    return TEXCONV_EXE.exists() and TEXCONV_EXE.is_file()


# ─── Decode for round-trip testing ──────────────────────────────────────────

def decode_dds_to_png(dds_path: Path, out_dir: Path | None = None) -> Path:
    """Decode a DDS back to PNG. Used by round-trip tests to verify the
    encoder. Returns the path of the produced PNG."""
    if not texconv_available():
        raise EncodeError("texconv not available")
    if out_dir is None:
        out_dir = dds_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    # texconv -ft PNG decodes; output goes to <out_dir>/<stem>.png
    args = [
        str(TEXCONV_EXE),
        "-ft", "PNG",
        "-y",
        "-o", str(out_dir),
        str(dds_path),
    ]
    p = subprocess.run(args, capture_output=True, text=True, timeout=120,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    if p.returncode != 0:
        raise EncodeError(f"texconv decode failed: {p.stderr}")
    out_png = out_dir / f"{dds_path.stem}.png"
    if not out_png.exists():
        raise EncodeError(f"decoded PNG not found: {out_png}")
    return out_png
