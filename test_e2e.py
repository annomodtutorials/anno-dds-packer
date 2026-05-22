"""End-to-end smoke test: real PNG inputs → packer + encoder pipeline →
DDS files on disk with correct DXGI byte.

Skips the UI; exercises packer.convert_sets_parallel + encoder.encode_dds
in the same orchestration the App uses (sans Tk).
"""
from __future__ import annotations

import shutil
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image

import encoder
import events as events_mod
import packer
from config import DDS_DXGI_BC7_TYPELESS


def _assert(c: bool, msg: str) -> None:
    print(f"  {'OK  ' if c else 'FAIL'}: {msg}")
    if not c:
        sys.exit(1)


def main() -> int:
    if not encoder.texconv_available():
        print("SKIP: texconv.exe missing")
        return 0

    src = Path(tempfile.mkdtemp(prefix="ddsp_e2e_src_"))
    out = Path(tempfile.mkdtemp(prefix="ddsp_e2e_out_"))
    try:
        # Set A: full PBR
        Image.new("RGBA", (256, 256), (200, 180, 160, 255)).save(src / "wall_diff.png")
        Image.new("RGBA", (256, 256), (128, 128, 255, 255)).save(src / "wall_norm.png")
        Image.new("L",    (256, 256), 100).save(src / "wall_metal.png")
        Image.new("L",    (256, 256), 200).save(src / "wall_ao.png")

        # Set B: diff + rm (synth normal)
        Image.new("RGBA", (256, 256), (90, 60, 40, 255)).save(src / "marble_diff.png")
        Image.new("RGBA", (256, 256), (50, 180, 80, 255)).save(src / "marble_rm.png")

        sets = packer.scan_paths([src])
        _assert(len(sets) == 2, f"two sets scanned (got {len(sets)})")

        # Collect events
        seen: list[events_mod.ProgressEvent] = []
        bus = []

        def push(ev: events_mod.ProgressEvent) -> None:
            seen.append(ev)

        id_map = {id(ts): i for i, ts in enumerate(sets)}

        t0 = time.monotonic()
        packer.convert_sets_parallel(
            sets,
            lod0_cap="256",
            selected_lods=[0, 1],
            fast_mode=True,
            out_root=out,
            same_as_input=False,
            cap=2,
            push_event=push,
            set_ids=id_map,
        )
        elapsed = time.monotonic() - t0
        print(f"  conversion finished in {elapsed:.1f}s")

        # Verify DDS files exist and have the expected DXGI byte
        expected = [
            "wall_diff_0.dds", "wall_diff_1.dds",
            "wall_norm_0.dds", "wall_norm_1.dds",
            "wall_metal_0.dds", "wall_metal_1.dds",
            "marble_diff_0.dds", "marble_diff_1.dds",
            "marble_norm_0.dds", "marble_norm_1.dds",
            "marble_metal_0.dds", "marble_metal_1.dds",
        ]
        for name in expected:
            p = out / name
            _assert(p.exists(), f"{name} produced")
            _assert(encoder.read_dxgi_format(p) == DDS_DXGI_BC7_TYPELESS,
                    f"{name} DXGI = 98")

        # Verify the canonical round-trip: marble_norm_0.dds alpha should
        # decode to ~75 (from rm.G=180)
        decoded = encoder.decode_dds_to_png(out / "marble_norm_0.dds", out / "_decoded")
        a = Image.open(decoded).convert("RGBA").getpixel((128, 128))[3]
        _assert(abs(a - 75) <= 4, f"round-trip norm.A ~75 (got {a})")

        # Check status events were fired
        statuses = {e.status for e in seen}
        for want in ("queued", "encoding", "done"):
            _assert(want in statuses, f"saw '{want}' status event")
        sids_done = {e.set_id for e in seen if e.status == "done"}
        _assert(sids_done == {0, 1}, f"both sets reported done (got {sids_done})")

        print("\nE2E PASSED")
        return 0
    finally:
        shutil.rmtree(src, ignore_errors=True)
        shutil.rmtree(out, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
