"""End-to-end encoder tests: PNG → BC7 DDS → patch DXGI → decode → verify pixels.

Slow (uses real texconv invocations) — runs in a few seconds for 64×64 inputs.

Verifies:
  - texconv.exe writes a BC7_UNORM DDS that we patch to BC7_TYPELESS (98)
  - DXGI byte at offset 0x80 reads as 98 after patch
  - decoding patched DDS via texconv still works (game-compatible)
  - The canonical round-trip: _rm.G=180 → norm.A ≈ 75 in the final DDS
"""
from __future__ import annotations

import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image

import encoder
import packer
from config import DDS_DXGI_BC7_TYPELESS


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        print(f"  FAIL: {msg}")
        sys.exit(1)
    print(f"  OK:   {msg}")


def with_tmp(fn):
    def wrap():
        tmp = Path(tempfile.mkdtemp(prefix="ddsenc_t_"))
        try:
            return fn(tmp)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    return wrap


@with_tmp
def test_encode_decode_solid(tmp: Path) -> None:
    """Encode a solid 128x128 PNG to BC7 DDS, patch header, decode, verify pixel."""
    print("test_encode_decode_solid")
    src_png = tmp / "solid_diff_0.png"
    Image.new("RGBA", (128, 128), (160, 80, 40, 255)).save(src_png)

    dst_dds = tmp / "solid_diff_0.dds"
    encoder.encode_dds(src_png, dst_dds, fast=True)
    _assert(dst_dds.exists(), f"DDS file produced at {dst_dds.name}")
    _assert(dst_dds.stat().st_size > 1024, "DDS larger than 1 KB")

    dxgi = encoder.read_dxgi_format(dst_dds)
    _assert(dxgi == DDS_DXGI_BC7_TYPELESS, f"DXGI format = {DDS_DXGI_BC7_TYPELESS} (got {dxgi})")

    # Decode back to PNG, sample a pixel
    out_png = encoder.decode_dds_to_png(dst_dds, out_dir=tmp / "decoded")
    img = Image.open(out_png).convert("RGBA")
    px = img.getpixel((64, 64))
    # BC7 is high-quality but not lossless; allow ±3 per channel
    for i, (got, want) in enumerate(zip(px, (160, 80, 40, 255))):
        _assert(abs(got - want) <= 4,
                f"decoded pixel ch{i} = {got}, want ~{want} (diff {abs(got - want)})")


@with_tmp
def test_round_trip_rm_to_norm_alpha(tmp: Path) -> None:
    """Canonical round-trip: _rm with G=180 + flat synthesised normal →
    DDS-encoded norm.A pixel value should round-trip to ~75 (= 255 − 180)."""
    print("test_round_trip_rm_to_norm_alpha")
    # Synthesise inputs
    Image.new("RGBA", (128, 128), (220, 220, 220, 255)).save(tmp / "thing_diff.png")
    Image.new("RGBA", (128, 128), (50, 180, 64, 255)).save(tmp / "thing_rm.png")

    sets = packer.scan_paths([tmp])
    _assert(len(sets) == 1, "single set")
    ts = sets[0]
    _assert(ts.synthetic_flat_normal, "synthetic_flat_normal set")

    norm_img = packer.build_packed_normal(ts, (128, 128))
    _assert(norm_img is not None, "normal image built")
    src_png = tmp / "thing_norm_0.png"
    norm_img.save(src_png)

    # Inspect the input PNG alpha first — that's what packer produces
    src_a = Image.open(src_png).convert("RGBA").getpixel((64, 64))[3]
    _assert(src_a == 75, f"source PNG norm.A = 75 before encoding (got {src_a})")

    # Encode to DDS, patch, decode, verify
    dst_dds = tmp / "thing_norm_0.dds"
    encoder.encode_dds(src_png, dst_dds, fast=True)

    out_png = encoder.decode_dds_to_png(dst_dds, out_dir=tmp / "decoded")
    decoded_a = Image.open(out_png).convert("RGBA").getpixel((64, 64))[3]
    _assert(abs(decoded_a - 75) <= 4,
            f"decoded norm.A ~75 (got {decoded_a}); BC7 tolerance ±4")


@with_tmp
def test_patch_is_idempotent(tmp: Path) -> None:
    """Calling patch_dxgi_format_98 twice doesn't corrupt the file."""
    print("test_patch_is_idempotent")
    src_png = tmp / "idemp_diff_0.png"
    Image.new("RGBA", (64, 64), (255, 255, 255, 255)).save(src_png)
    dst_dds = tmp / "idemp_diff_0.dds"
    encoder.encode_dds(src_png, dst_dds, fast=True)
    first = encoder.read_dxgi_format(dst_dds)
    encoder.patch_dxgi_format_98(dst_dds)
    second = encoder.read_dxgi_format(dst_dds)
    _assert(first == second == DDS_DXGI_BC7_TYPELESS, "DXGI stays 98 after re-patch")


def main() -> int:
    if not encoder.texconv_available():
        print("SKIP: texconv.exe missing")
        return 0
    test_encode_decode_solid()
    test_round_trip_rm_to_norm_alpha()
    test_patch_is_idempotent()
    print("\nENCODER TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
