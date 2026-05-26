# Anno DDS Packer

A Windows desktop tool that converts image textures into the channel-packed,
BC7-typeless DDS files expected for material modding in **Anno 117: Pax Romana**
and **Anno 1800**. Drop a folder of exports from Blender, Substance, Marmoset,
or any AI 3D generator — the tool auto-detects which file is which, repacks
channels into Anno's convention, generates the full LOD chain, and writes
game-ready `.dds` files you can drop straight into your mod folder.

It can also go the other direction: drop existing game DDS files to **unpack**
them back into editable PNGs, per channel.

---

## Features

- **Broad format support** — PNG, JPG, TIFF, TGA, BMP and any format Pillow can decode. Mix formats freely within a set.
- **Auto-detection** — recognises map types from filename suffixes across all common naming conventions (Substance, Blender bake names, custom). See the full table below.
- **Channel packing** — Metal, Roughness, and AO maps are automatically merged into Anno's packed PBR DDS. Gloss is inverted to Roughness on the fly.
- **LOD chain** — generates LOD0–LOD4 at the correct resolution steps. LOD0 is mandatory; LOD1–4 are optional per-run.
- **BC7_TYPELESS encoding** — textures are encoded as DXGI format 98 (`BC7_TYPELESS`), exactly what the game runtime expects. `texconv` writes BC7_UNORM (99); the DXT10 header byte is patched post-encode.
- **Unpack mode** — drop game DDS files to extract all channels back to editable PNGs.
- **Auto mode switching** — drop DDS files while in Pack mode and the tool switches to Unpack automatically (and vice versa).
- **Two themes** — Anno (gold on navy, serif) and Modern (violet on dark, sans-serif).
- **Live VRAM telemetry** — displays GPU memory pressure in real time during conversion (NVIDIA GPUs).
- **Parallel conversion** — multiple texture sets are processed concurrently, capped at your CPU count or 8, whichever is lower.
- **Persistent settings** — output folder, LOD selection, LOD0 size cap, and theme are remembered across sessions.

---

## Requirements

- **Windows 10 / 11 x64**
- **Microsoft Edge WebView2 runtime** — ships with Windows 11 and most current Windows 10 machines. If not present, it is downloaded automatically on first launch.

No Python, no runtime install, nothing else.

---

## Installation

### Portable *(recommended)*

1. Download **`Anno_DDS_Packer_v1.2.0_portable.zip`** from the [Releases](../../releases/latest) page.
2. Extract the zip anywhere — Desktop, tools folder, USB stick, wherever.
3. Run **`Anno DDS Packer.exe`**.

That's it. Settings are saved to `%APPDATA%\AnnoDDSPacker\settings.json`.
To uninstall, delete the folder. Nothing else is written to your system.

---

## Usage

1. **Drop** image files or a folder onto the window, or click **Add Files** / **Add Folder**.
   - Sets are grouped automatically from filename suffixes (see table below).
2. **Configure LODs** — LOD0 is always written. Enable LOD1–4 as needed.
3. **Set LOD0 size** — *As input* keeps the source resolution. Cap it at 4096 / 2048 / 1024 / 512 / 256 if needed.
4. **Pick an output folder** — or leave *Same folder as each input* on (default).
5. Click **Convert to DDS**. A progress ring tracks each set. Files are written as:

```
<set_base_name>_<map>_<lod>.dds
```

For example: `wall_diff_0.dds`, `wall_norm_2.dds`, `marble_metal_4.dds`.

To remove a single set from the queue without clearing everything, click the **✕** button at the top-right of its row.

### Unpack mode

Switch to **Unpack** in the top-right mode toggle, then drop `.dds` files (or a folder containing them). Each file is unpacked into its constituent PNG channels. Dropping DDS files while in Pack mode switches automatically.

---

## Supported Map Types & Suffix Detection

The detector matches the end of the filename stem (before extension), stripping
leading separators (`_`, `-`, `.`) and trailing numeric indices (`_0`, `_001`,
`_v2`, etc.) so suffixed variants group correctly.

| Detected type | Recognised suffixes |
|---|---|
| Diffuse / Base colour | `_diff` `_diffuse` `_albedo` `_basecolor` `_color` `_colour` `_bc` |
| Normal | `_norm` `_normal` `_nrm` |
| Metalness | `_metal` `_metallic` `_metalness` |
| Roughness | `_rough` `_roughness` |
| Glossiness *(inverted to roughness)* | `_gloss` `_glossiness` |
| Ambient Occlusion | `_ao` `_occlusion` `_ambientocclusion` |
| Height / Displacement | `_height` `_disp` `_displacement` |
| Opacity / Alpha | `_opacity` `_alpha` `_opc` |
| Emission / Night mask | `_mask` `_emission` `_emissive` |
| Pre-packed RM | `_rm` |
| Pre-packed ORM | `_orm` |

If the tool finds separate Metal / Roughness / AO maps, they are channel-packed
at runtime into Anno's combined PBR texture. Pre-packed `_orm` and `_rm` maps
are passed through directly.

---

## Output Convention

| Input maps | Output DDS | Channels |
|---|---|---|
| Diffuse (+ optional Opacity) | `*_diff_N.dds` | RGB = colour, A = opacity |
| Normal (+ optional Roughness) | `*_norm_N.dds` | RGB = DirectX normal, A = glossiness |
| Metal + Rough/Gloss + AO → packed | `*_metal_N.dds` | R = metal, G = roughness, B = AO |
| Height / Displacement | `*_height_N.dds` | R = displacement |
| Emission + Night mask | `*_mask_N.dds` | RGB = emission, A = night mask |

Where `N` is the LOD index (0–4). All textures are **BC7_TYPELESS** (DXGI 98).

---

## Architecture

The app is built on **Tauri** (Rust shell + WebView2 frontend) with a Python
FastAPI sidecar (`packer-server.exe`) that handles all image processing over a
local HTTP/SSE bridge on port 45291.

```
Anno DDS Packer.exe          ← Rust/Tauri main process
  └── WebView2 window        ← HTML/CSS/JS UI (React 18, no bundler)
  └── packer-server.exe      ← Python FastAPI sidecar (spawned on launch)
        ├── packer.py        ← scan, group, pack, channel math
        ├── unpacker.py      ← DDS → PNG channel extraction
        ├── encoder.py       ← texconv.exe invocation + DXGI 99→98 patch
        ├── server.py        ← FastAPI HTTP + SSE event stream
        ├── settings.py      ← JSON persistence under %APPDATA%
        ├── config.py        ← suffix tables, MapType, TextureSet
        ├── events.py        ← ProgressEvent dataclass
        └── vram.py          ← pynvml VRAM probe (optional, NVIDIA only)
```

The Tauri shell handles native file dialogs, drag-and-drop events, window
management, and sidecar lifecycle. The sidecar emits SSE progress events that
the frontend subscribes to for live donut ring updates.

### Source files

| Path | Purpose |
|---|---|
| `src-tauri/src/main.rs` | Tauri entry, sidecar spawn, TCP readiness poll, event plumbing |
| `src-tauri/src/commands.rs` | Tauri invoke handlers (file pickers, window controls) |
| `src-tauri/tauri.conf.json` | Window config, CSP, bundle targets |
| `webui/index.html` | HTML entry — loads React, splash screen, bridge init |
| `webui/app.jsx` | Top-level React app, state, bridge calls |
| `webui/anno.jsx` | Anno gold theme components |
| `webui/modern.jsx` | Modern violet theme components |
| `webui/parts.jsx` | Shared widgets (donut, chips, icons) |
| `webui/styles.css` | Full theme palette and layout |
| `packer/server.py` | FastAPI HTTP server + SSE endpoint |
| `packer/packer.py` | Scan, group, channel packing, LOD math |
| `packer/unpacker.py` | DDS channel extraction (unpack mode) |
| `packer/encoder.py` | texconv invocation, BC7_TYPELESS header patch |
| `tools/texconv.exe` | Microsoft DirectXTex CLI — BC7 GPU encoding |

---

## Building from Source

Requires: **Rust + Cargo**, **Node.js** (for Tauri CLI), **Python 3.11+**, **PyInstaller**.

```bat
# 1. Build the Python sidecar (packer-server.exe)
build_packer.bat

# 2. Build the Tauri app (compiles Rust, embeds webui, packages NSIS + portable)
build_tauri.bat
```

For quick iteration without a full installer build:

```bat
# Compile JSX (requires esbuild)
npx esbuild anno.jsx --bundle=false --format=iife --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile=anno.js

# Rebuild Rust binary (embeds updated webui files)
cd src-tauri && cargo build --release

# Copy to bundle directory (close the app first)
update_sidecar.bat
```

---

## Acknowledgements

### Bundled tools

- **[Microsoft DirectXTex](https://github.com/microsoft/DirectXTex)** (`texconv.exe`) — MIT License — BC7 GPU texture encoding. Copyright (c) Microsoft Corporation.

### Frameworks & libraries

- **[Tauri](https://tauri.app)** — MIT / Apache 2.0 — Rust + WebView2 application framework
- **[React 18](https://react.dev)** (Meta Platforms) — MIT License — UI runtime
- **[FastAPI](https://fastapi.tiangolo.com)** — MIT License — Python HTTP/SSE server
- **[Pillow](https://python-pillow.org)** — HPND License — image loading and channel manipulation
- **[pynvml](https://github.com/gpuopenanalytics/pynvml)** — BSD 3-Clause — optional NVIDIA VRAM telemetry
- **[PyInstaller](https://pyinstaller.org)** — GPL with bootloader exception — Python-to-exe bundler

### Fonts

- **[Cinzel](https://fonts.google.com/specimen/Cinzel)** (Natanael Gama) — SIL Open Font License v1.1 — display typeface
- **[Inter](https://rsms.me/inter/)** (Rasmus Andersson) — SIL Open Font License v1.1 — UI body font
- **[JetBrains Mono](https://www.jetbrains.com/lp/mono/)** (JetBrains) — SIL Open Font License v1.1 — monospace font

### Runtime

- **Microsoft Edge WebView2** — WebView2 SDK License — browser runtime host

---

## License

MIT — see `LICENSE`.
