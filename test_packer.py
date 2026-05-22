"""Pipeline tests for packer.py.

Run with:  python test_packer.py

Builds synthetic 64×64 PNGs in a temp folder, exercises scan + packed-PBR
post-process + channel builders, then asserts pixel values match the
documented packing convention. Most critically:

    _rm with G=180  ->  norm.A = 75   (= 255 − 180)
"""
from __future__ import annotations

import shutil
import sys
import tempfile
from pathlib import Path

from PIL import Image

import packer
from config import LOD0_SIZE_AS_INPUT, MapType


SIZE = (64, 64)


def _solid(rgb_or_l, size=SIZE) -> Image.Image:
    """Make a solid-colour test image. rgb_or_l = (r,g,b) or (r,g,b,a) or int (L)."""
    if isinstance(rgb_or_l, int):
        return Image.new("L", size, rgb_or_l)
    mode = "RGB" if len(rgb_or_l) == 3 else "RGBA"
    return Image.new(mode, size, rgb_or_l)


def _pixel(img: Image.Image, channel: int = 0) -> int:
    """Return the value of channel `channel` at (4, 4) — assumes flat image."""
    if img.mode == "L":
        return img.getpixel((4, 4))
    return img.getpixel((4, 4))[channel]


def _assert(cond: bool, msg: str) -> None:
    if not cond:
        print(f"  FAIL: {msg}")
        sys.exit(1)
    print(f"  OK:   {msg}")


def with_tmp(fn):
    def wrap():
        tmp = Path(tempfile.mkdtemp(prefix="ddspack_t_"))
        try:
            return fn(tmp)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    return wrap


# ─── tests ──────────────────────────────────────────────────────────────────

@with_tmp
def test_suffix_detect(tmp: Path) -> None:
    print("test_suffix_detect")
    cases = [
        ("wall_diff", "wall", MapType.DIFF),
        ("wall_diffuse", "wall", MapType.DIFF),
        ("wall_Color", "wall", MapType.DIFF),
        ("wall_BaseColor", "wall", MapType.DIFF),
        ("wall_BC", "wall", MapType.DIFF),
        ("wall_norm", "wall", MapType.NORM),
        ("wall_Normal", "wall", MapType.NORM),
        ("wall_nrm", "wall", MapType.NORM),
        ("wall_metallic", "wall", MapType.METAL),
        ("wall_metal", "wall", MapType.METAL),
        ("wall_metalness", "wall", MapType.METAL),
        ("wall_AO", "wall", MapType.AO),
        ("wall_ambientocclusion", "wall", MapType.AO),
        ("wall_gloss", "wall", MapType.GLOSS),
        ("wall_glossiness", "wall", MapType.GLOSS),
        ("wall_roughness", "wall", MapType.ROUGH),
        ("wall_rough", "wall", MapType.ROUGH),
        ("wall_height", "wall", MapType.HEIGHT),
        ("wall_displacement", "wall", MapType.HEIGHT),
        ("wall_disp", "wall", MapType.HEIGHT),
        ("wall_RM", "wall", MapType.RM),
        ("wall_orm", "wall", MapType.ORM),
        ("wall_opacity", "wall", MapType.OPACITY),
        ("wall_alpha", "wall", MapType.OPACITY),
        # No-suffix -> returned unchanged with None
        ("wall", "wall", None),
    ]
    for stem, want_base, want_mt in cases:
        base, mt = packer.detect_suffix(stem)
        _assert(base.lower() == want_base.lower() and mt == want_mt,
                f"{stem!r} -> ({base!r}, {mt}) [expected ({want_base!r}, {want_mt})]")


@with_tmp
def test_grouping_and_packed_pbr(tmp: Path) -> None:
    print("test_grouping_and_packed_pbr")
    # Set A: full PBR — diff + norm + metal + ao
    _solid((200, 180, 160, 255)).save(tmp / "wall_diff.png")
    _solid((128, 128, 255, 255)).save(tmp / "wall_norm.png")
    _solid(100).save(tmp / "wall_metal.png")
    _solid(180).save(tmp / "wall_ao.png")
    # Set B: diff + rm — no normal supplied -> synthesise
    _solid((90, 60, 40, 255)).save(tmp / "marble_diff.png")
    _solid((50, 180, 220, 255)).save(tmp / "marble_rm.png")
    # Set C: orm only
    _solid((140, 220, 60, 200)).save(tmp / "stone_diff.png")
    _solid((90, 200, 30, 255)).save(tmp / "stone_orm.png")

    sets = packer.scan_paths([tmp])
    by = {s.base_name: s for s in sets}
    _assert(set(by.keys()) == {"wall", "marble", "stone"}, f"groups={list(by.keys())}")
    _assert(by["wall"].synthetic_flat_normal is False, "wall has real normal -> no synth")
    _assert(by["marble"].synthetic_flat_normal is True, "marble has _rm + no normal -> synth")
    _assert(by["stone"].synthetic_flat_normal is True, "stone has _orm + no normal -> synth")


@with_tmp
def test_packing_diff(tmp: Path) -> None:
    print("test_packing_diff")
    _solid((200, 180, 160, 255)).save(tmp / "wall_diff.png")
    _solid(140).save(tmp / "wall_opacity.png")
    sets = packer.scan_paths([tmp])
    ts = sets[0]
    img = packer.build_packed_diffuse(ts, SIZE)
    _assert(img is not None and img.mode == "RGBA", "diff produces RGBA")
    _assert(_pixel(img, 0) == 200, f"diff.R = 200 (got {_pixel(img, 0)})")
    _assert(_pixel(img, 1) == 180, f"diff.G = 180 (got {_pixel(img, 1)})")
    _assert(_pixel(img, 2) == 160, f"diff.B = 160 (got {_pixel(img, 2)})")
    _assert(_pixel(img, 3) == 140, f"diff.A = 140 from _opacity (got {_pixel(img, 3)})")


@with_tmp
def test_packing_metal_with_ao(tmp: Path) -> None:
    print("test_packing_metal_with_ao")
    _solid((255, 255, 255, 255)).save(tmp / "rock_diff.png")
    _solid(110).save(tmp / "rock_metal.png")
    _solid(200).save(tmp / "rock_ao.png")
    sets = packer.scan_paths([tmp])
    ts = sets[0]
    img = packer.build_packed_metal(ts, SIZE)
    _assert(img is not None, "metal produced")
    _assert(_pixel(img, 0) == 110 and _pixel(img, 1) == 110 and _pixel(img, 2) == 110,
            f"metal.RGB = 110 grey (got {_pixel(img, 0)},{_pixel(img, 1)},{_pixel(img, 2)})")
    _assert(_pixel(img, 3) == 200, f"metal.A = 200 from _ao (got {_pixel(img, 3)})")


@with_tmp
def test_packing_norm_from_real_normal_and_rough(tmp: Path) -> None:
    print("test_packing_norm_from_real_normal_and_rough")
    _solid((128, 128, 255, 255)).save(tmp / "tile_norm.png")
    _solid(180).save(tmp / "tile_roughness.png")
    sets = packer.scan_paths([tmp])
    ts = sets[0]
    img = packer.build_packed_normal(ts, SIZE)
    _assert(img is not None, "normal produced")
    _assert(_pixel(img, 3) == 75, f"norm.A = 255-180 = 75 (got {_pixel(img, 3)})")


@with_tmp
def test_packing_rm_round_trip(tmp: Path) -> None:
    """The canonical round-trip per the build spec: _rm with G=180 -> norm.A=75."""
    print("test_packing_rm_round_trip")
    # _rm: R unused, G=180 (roughness), B=64 (metal), A unused
    _solid((50, 180, 64, 255)).save(tmp / "thing_rm.png")
    _solid((220, 220, 220, 255)).save(tmp / "thing_diff.png")
    sets = packer.scan_paths([tmp])
    ts = sets[0]
    _assert(ts.synthetic_flat_normal is True, "_rm alone marks synthetic_flat_normal")
    # Normal
    norm = packer.build_packed_normal(ts, SIZE)
    _assert(norm is not None, "synthetic normal produced")
    _assert(_pixel(norm, 0) == 128 and _pixel(norm, 1) == 128 and _pixel(norm, 2) == 255,
            f"synth norm.RGB = 128/128/255 (got {_pixel(norm, 0)}/{_pixel(norm, 1)}/{_pixel(norm, 2)})")
    _assert(_pixel(norm, 3) == 75, f"norm.A = 255 - 180 = 75 (got {_pixel(norm, 3)})")
    # Metal
    metal = packer.build_packed_metal(ts, SIZE)
    _assert(metal is not None, "metal from _rm.B produced")
    _assert(_pixel(metal, 0) == 64 and _pixel(metal, 1) == 64 and _pixel(metal, 2) == 64,
            f"metal.RGB = 64 (from _rm.B) (got {_pixel(metal,0)}/{_pixel(metal,1)}/{_pixel(metal,2)})")
    _assert(_pixel(metal, 3) == 255, f"metal.A = 255 (no _ao) (got {_pixel(metal, 3)})")


@with_tmp
def test_packing_orm(tmp: Path) -> None:
    print("test_packing_orm")
    # _orm: R=AO=200, G=roughness=120 (-> gloss alpha 135), B=metal=90
    _solid((200, 120, 90, 255)).save(tmp / "stone_orm.png")
    _solid((180, 160, 140, 255)).save(tmp / "stone_diff.png")
    sets = packer.scan_paths([tmp])
    ts = sets[0]
    _assert(ts.synthetic_flat_normal is True, "_orm alone marks synthetic_flat_normal")
    metal = packer.build_packed_metal(ts, SIZE)
    _assert(_pixel(metal, 0) == 90 and _pixel(metal, 3) == 200,
            f"metal.RGB=90 from _orm.B, metal.A=200 from _orm.R (got rgb={_pixel(metal,0)} a={_pixel(metal,3)})")
    norm = packer.build_packed_normal(ts, SIZE)
    _assert(_pixel(norm, 3) == 135, f"norm.A = 255 - 120 = 135 (got {_pixel(norm, 3)})")


@with_tmp
def test_loose_drop_runs_postprocess(tmp: Path) -> None:
    """Drop loose files (not via folder scan) — verify the post-process still runs."""
    print("test_loose_drop_runs_postprocess")
    p1 = tmp / "thing_diff.png"; _solid((220, 200, 180, 255)).save(p1)
    p2 = tmp / "thing_rm.png"; _solid((50, 200, 80, 255)).save(p2)
    sets = packer.scan_paths([p1, p2])     # loose-file path
    _assert(len(sets) == 1 and sets[0].synthetic_flat_normal is True,
            "loose drop still applies packed-PBR post-process")


@with_tmp
def test_reference_size_and_cap(tmp: Path) -> None:
    print("test_reference_size_and_cap")
    Image.new("RGBA", (2048, 2048), (255, 0, 0, 255)).save(tmp / "big_diff.png")
    sets = packer.scan_paths([tmp])
    ts = sets[0]
    _assert(packer.reference_size(ts) == (2048, 2048), "native is 2048")
    _assert(packer.cap_size((2048, 2048), "1024") == (1024, 1024),
            "cap 1024 of 2048 -> 1024")
    _assert(packer.cap_size((2048, 2048), LOD0_SIZE_AS_INPUT) == (2048, 2048),
            "as-input keeps 2048")


@with_tmp
def test_lod_chain(tmp: Path) -> None:
    print("test_lod_chain")
    lod0 = (2048, 2048)
    _assert(packer.lod_size(lod0, 0) == (2048, 2048), "lod0 = full")
    _assert(packer.lod_size(lod0, 1) == (1024, 1024), "lod1 = half")
    _assert(packer.lod_size(lod0, 2) == (512, 512), "lod2 = quarter")
    _assert(packer.lod_size(lod0, 3) == (256, 256), "lod3 = eighth")
    _assert(packer.lod_size(lod0, 4) == (128, 128), "lod4 = 1/16")


def main() -> int:
    test_suffix_detect()
    test_grouping_and_packed_pbr()
    test_packing_diff()
    test_packing_metal_with_ao()
    test_packing_norm_from_real_normal_and_rough()
    test_packing_rm_round_trip()
    test_packing_orm()
    test_loose_drop_runs_postprocess()
    test_reference_size_and_cap()
    test_lod_chain()
    print("\nALL TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
