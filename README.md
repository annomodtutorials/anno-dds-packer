# Anno DDS Packer

A Windows desktop tool that converts image textures into the channel-packed,
BC7-typeless DDS files expected for material modding in **Anno 117: Pax Romana**
and **Anno 1800**. Drop a folder of exports from Blender, Substance, Marmoset,
or any AI 3D generator — the tool auto-detects which file is which, repacks
channels into Anno's convention, generates the full LOD chain, and writes
game-ready `.dds` files you can drop straight into your mod folder.

---

## Features

- **Broad format support** — PNG, JPG, TIFF, TGA, BMP and any format Pillow can decode. Mix formats freely within a set.
- **Auto-detection** — recognises map types from filename suffixes across all common naming conventions (Substance, Blender bake names, custom). See the full table below.
- **Channel packing** — Metal, Roughness, and AO maps are automatically merged into Anno's packed PBR DDS. Gloss is inverted to Roughness on the fly.
- **LOD chain** — generates LOD0–LOD4 at the correct resolution steps. LOD0 is mandatory; LOD1–4 are optional per-run.
- **BC7_TYPELESS encoding** — textures are encoded as DXGI format 98 (`BC7_TYPELESS`), exactly what the game runtime expects. `texconv` writes BC7_UNORM (99); the DXT10 header byte is patched post-encode.
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

1. Download **`Anno DDS Packer_1.1.0_x64_portable.zip`** from the [Releases](../../releases/latest) page.
2. Extract the zip anywhere — Desktop, tools folder, USB stick, wherever.
3. Run **`Anno DDS Packer.exe`**.

That's it. Settings are saved to `%APPDATA%\AnnoDDSPacker\settings.json`.
To uninstall, delete the folder. Nothing else is written to your system.

### Installer

1. Download **`Anno DDS Packer_1.1.0_x64-setup.exe`** from the [Releases](../../releases/latest) page.
2. Run the installer. The app installs to Program Files and creates a Start Menu entry.

---

## Usage

1. **Drop** image files or a folder onto the window, or click **Pick Files** / **Pick Folder**.
   - Sets are grouped automatically from filename suffixes (see table below).
2. **Configure LODs** — LOD0 is always written. Enable LOD1–4 as needed.
3. **Set LOD0 size** — *As input* keeps the source resolution. Cap it at 4096 / 2048 / 1024 / 512 / 256 if needed.
4. **Toggle Fast mode** for a ~1.5× speed increase with visually identical results.
5. **Pick an output folder** — or leave *Same folder as each input* on (default).
6. Click **Convert to DDS**. A progress ring tracks each set. Files are written as:

```
<set_base_name>_<map>_<lod>.dds
```

For example: `wall_diff_0.dds`, `wall_norm_2.dds`, `marble_metal_4.dds`.

To remove a single set from the queue without clearing everything, click the **✕** button at the top-right of its row.

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
| Pre-packed RM | `_rm` |
| Pre-packed ORM | `_orm` |

If the tool finds separate Metal / Roughness / AO maps, they are channel-packed
at runtime into Anno's combined PBR texture. Pre-packed `_orm` and `_rm` maps
are passed through directly.

---

## Output Convention

| Input maps | Output DDS |
|---|---|
| Diffuse (+ optional Opacity in alpha) | `*_diff_N.dds` |
| Normal | `*_norm_N.dds` |
| Metal + Rough + AO → packed | `*_metal_N.dds` |
| Height | `*_height_N.dds` |

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

`build_tauri.bat` produces:
- `src-tauri\target\release\bundle\nsis\Anno DDS Packer_1.1.0_x64-setup.exe`
- `src-tauri\target\release\bundle\Anno DDS Packer_1.1.0_x64_portable.zip`

To compile JSX to JS manually (requires `esbuild`):
```bat
esbuild --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui/app.js webui/app.jsx
```

---

## Acknowledgements

- **Microsoft DirectXTex** (`texconv.exe`) — MIT — BC7 GPU encoding
- **Tauri** — MIT / Apache 2.0 — Rust + WebView2 application framework
- **Microsoft Edge WebView2** — WebView2 runtime host
- **FastAPI** — MIT — Python HTTP server
- **Pillow** — HPND — image loading and channel manipulation
- **pynvml** — BSD-3-Clause — optional NVIDIA VRAM telemetry
- **React 18** — MIT — UI runtime
- **OPTIAlert** — Anno display typeface
- **Inter** (Rasmus Andersson) and **JetBrains Mono** — SIL Open Font License v1.1

---

## License

MIT — see `LICENSE`.
