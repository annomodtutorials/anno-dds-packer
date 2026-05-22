"""Settings load/save round-trip with BOM tolerance and defensive parsing."""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

import settings as st


def _assert(c: bool, msg: str) -> None:
    print(f"  {'OK  ' if c else 'FAIL'}: {msg}")
    if not c:
        sys.exit(1)


def main() -> int:
    # Re-point APPDATA into a tmpdir so the test doesn't clobber real settings
    tmp = Path(tempfile.mkdtemp(prefix="ddsp_settings_"))
    old_appdata = os.environ.get("APPDATA")
    os.environ["APPDATA"] = str(tmp)
    # Re-resolve settings_dir() inside the module by re-importing
    import importlib
    importlib.reload(st)
    try:
        # 1. Empty load returns defaults
        s = st.load()
        _assert(s.theme_name == "anno", "default theme is anno")
        _assert(s.selected_lods == [0], "default LODs = [0]")
        _assert(s.fast_mode is False, "default fast_mode = False")
        _assert(s.same_as_input is True, "default same_as_input = True")
        _assert(s.lod0_size == "AS INPUT", "default lod0_size = AS INPUT")

        # 2. Round-trip
        s.theme_name = "modern"
        s.selected_lods = [0, 2, 4]
        s.fast_mode = True
        s.same_as_input = False
        s.lod0_size = "1024"
        s.output_dir = r"C:\Game\mods"
        s.parallel_sets_max = 6
        st.save(s)
        s2 = st.load()
        _assert(s2.theme_name == "modern", "round-trip theme")
        _assert(s2.selected_lods == [0, 2, 4], "round-trip LODs")
        _assert(s2.fast_mode is True, "round-trip fast_mode")
        _assert(s2.same_as_input is False, "round-trip same_as_input")
        _assert(s2.lod0_size == "1024", "round-trip lod0_size")
        _assert(s2.output_dir == r"C:\Game\mods", "round-trip output_dir")
        _assert(s2.parallel_sets_max == 6, "round-trip parallel_sets_max")

        # 3. UTF-8-BOM tolerance (PowerShell writes UTF-8 with BOM)
        bom_payload = '﻿' + json.dumps({"theme_name": "anno", "selected_lods": [0, 3]})
        st.settings_path().write_text(bom_payload, encoding="utf-8")
        s3 = st.load()
        _assert(s3.theme_name == "anno", "BOM-prefixed JSON parses")
        _assert(s3.selected_lods == [0, 3], "BOM-prefixed selected_lods preserved")

        # 4. Garbage tolerance — invalid JSON falls back to defaults
        st.settings_path().write_text("{ not json", encoding="utf-8")
        s4 = st.load()
        _assert(s4.theme_name == "anno", "broken JSON yields defaults")

        # 5. Unknown keys are ignored
        st.settings_path().write_text(json.dumps({
            "theme_name": "modern", "wholly_unknown": "ignored",
        }), encoding="utf-8")
        s5 = st.load()
        _assert(s5.theme_name == "modern", "unknown keys ignored")

        # 6. LOD0 forced on even if missing from selected_lods
        st.settings_path().write_text(json.dumps({
            "selected_lods": [2, 3],
        }), encoding="utf-8")
        s6 = st.load()
        _assert(0 in s6.selected_lods, "LOD0 auto-included if missing")

        # 7. Out-of-range LODs filtered
        st.settings_path().write_text(json.dumps({
            "selected_lods": [0, 7, -1, 2, 99],
        }), encoding="utf-8")
        s7 = st.load()
        _assert(s7.selected_lods == [0, 2], f"only valid LODs kept (got {s7.selected_lods})")

        # 8. Invalid theme defaults back to anno
        st.settings_path().write_text(json.dumps({
            "theme_name": "rainbow",
        }), encoding="utf-8")
        s8 = st.load()
        _assert(s8.theme_name == "anno", "unknown theme defaults to anno")

        print("\nSETTINGS TESTS PASSED")
        return 0
    finally:
        if old_appdata is not None:
            os.environ["APPDATA"] = old_appdata
        else:
            os.environ.pop("APPDATA", None)
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
