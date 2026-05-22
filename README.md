# Anno DDS Packer (pywebview edition)

Windows desktop tool that converts PNG textures into the channel-packed,
BC7-typeless DDS files the game **Anno 117: Pax Romana** expects for material
modding. Drop a folder of PNG exports from Blender / Substance / any AI 3D
generator and the tool auto-detects which file is which, repacks channels
into Anno's convention, generates the LOD chain, and writes the `.dds` files
you can drop straight into your mod folder.

Two visual themes (Anno gold-on-navy serif and Modern violet-on-dark sans);
the UI is the React prototype from Claude Design, embedded directly in a
Microsoft Edge WebView2 host — so what you see is byte-for-byte the design
mockup. Drag-and-drop, native file pickers, live VRAM telemetry, parallel
set conversion, full mip chain per LOD, GPU-accelerated BC7 encoding via
DirectXTex.

## Requirements

- **Windows 10/11** with the Microsoft Edge WebView2 runtime (ships with
  Edge — pre-installed on Windows 11 and most current Windows 10 machines).
- Python only when running from source. The `dist\AnnoDDSPacker.exe` build
  needs nothing else.

## Run

**Pre-built:** double-click `dist\AnnoDDSPacker.exe`.

**From source:**

```
pip install pillow pywebview pynvml pyinstaller
python anno_dds_packer.py
```

`--debug` opens the WebView dev-tools (right-click → inspect in the window).

## Use

1. Drop a folder of PNGs onto the window, or click *Pick Files* / *Pick Folder*.
   Sets are auto-detected from filename suffixes — see *Help & Channel
   Reference* in-app for the full table.
2. Choose which LODs to write (LOD0 is mandatory, LOD1–4 default off).
3. Choose the LOD0 size cap (*As input* by default).
4. Toggle *Fast mode* for a ~1.5× speedup with visually identical output.
5. Click *Convert to DDS*. Donut tracks per-set progress; DDS files land in
   the output folder, or in each input's folder if *Same as input folder*
   is on (toggle lives in the "…" flyout off the entry).

Output filenames: `<set>_<map>_<lod>.dds` — e.g. `wall_diff_0.dds`,
`wall_norm_2.dds`, `marble_metal_4.dds`.

DDS files are encoded as **BC7_TYPELESS** (DXGI format 98) — exactly what
the game runtime expects. texconv writes BC7_UNORM (99); we patch the
DXT10 header byte at offset 0x80 post-encode.

## Architecture

| File | Purpose |
|---|---|
| `anno_dds_packer.py` | Entry — DPI awareness, pywebview window, native WM_DROPFILES hook |
| `bridge.py` | Python API class exposed to JavaScript via `window.pywebview.api` |
| `webui/index.html` | Web entry — loads local React + Babel + JSX |
| `webui/app.jsx` | Top-level React app; bridges to Python |
| `webui/anno.jsx`, `modern.jsx`, `parts.jsx` | Theme views + shared widgets (from the design prototype) |
| `webui/styles.css` | Full theme palette + layout (from the design prototype, +flyout/dropdown extras) |
| `webui/lib/` | Bundled React 18 + Babel-standalone (offline-runnable) |
| `webui/assets/` | PNGs, fonts, .ico |
| `packer.py` | `scan_paths`, `apply_packed_pbr_postprocess`, `build_packed_*`, `convert_sets_parallel` |
| `encoder.py` | texconv.exe invocation + DXGI patch 99 → 98 |
| `events.py` | `ProgressEvent` dataclass |
| `vram.py` | pynvml best-effort VRAM probe |
| `settings.py` | JSON load/save under `%APPDATA%/AnnoDDSPacker/settings.json` |
| `config.py` | Suffix tables, `MapType`, `TextureSet`, layout constants |
| `tools/texconv.exe` | Microsoft DirectXTex CLI (MIT) |

Tests:
* `test_packer.py` — suffix detection, grouping, channel math, packed-PBR
* `test_encoder.py` — texconv + DXGI patch + decode round-trip
* `test_settings.py` — JSON round-trip + UTF-8-BOM tolerance
* `test_e2e.py` — full pipeline against synthetic PNGs

```
python test_packer.py && python test_encoder.py && python test_settings.py && python test_e2e.py
```

## Build

```
build_exe.bat
```

Produces `dist\AnnoDDSPacker.exe` (~39 MB single-file). Bundles `webui/`,
React/Babel runtime, texconv.exe, every PNG and font asset. Settings persist
to `%APPDATA%\AnnoDDSPacker\settings.json`.

## Why pywebview

This project initially used Tkinter for the UI. Tkinter's `Canvas` does not
anti-alias primitives, so rounded buttons, donut arcs, LOD chips, dashed
borders etc. came out jagged compared to the React prototype. v03 swaps the
GUI layer for pywebview, which embeds the exact prototype HTML/CSS/JSX in an
EdgeWebView2 host. The visual fidelity to the design mockup is therefore
bit-perfect because the UI literally *is* the mockup. The Python backend
(packer, encoder, DXGI patch, settings, VRAM probe) is unchanged from v02.

## Acknowledgements

* **Microsoft DirectXTex** (`texconv.exe`) — MIT license — BC7 GPU encoding.
* **Microsoft Edge WebView2** — runtime host (pre-installed on Windows).
* **pywebview** — BSD-3-Clause — Python ↔ JavaScript bridge.
* **React 18** — MIT license — UI runtime.
* **Babel standalone** — MIT license — JSX transform at runtime.
* **Pillow** — HPND license — image loading and channel manipulation.
* **pynvml** — BSD-3-Clause — optional NVIDIA VRAM telemetry.
* **OPTIAlert** — Anno display typeface (bundled per its source's terms).
* **Inter** (Rasmus Andersson) and **JetBrains Mono** — SIL Open Font License v1.1.
* **Anno 117 dev blog** — channel-packing convention and BC7_TYPELESS spec.

## License

MIT — see `LICENSE`.
