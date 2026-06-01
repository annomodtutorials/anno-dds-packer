"""Config constants, suffix tables, dataclasses. No runtime dependencies."""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


# ─── Paths ────────────────────────────────────────────────────────────────────

def app_base_dir() -> Path:
    """Project root when running from source; PyInstaller bundle dir when frozen."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent


ASSETS_DIR = app_base_dir() / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"
ICONS_DIR = ASSETS_DIR / "icons"
TOOLS_DIR = app_base_dir() / "tools"
TEXCONV_EXE = TOOLS_DIR / "texconv.exe"

APPDATA_DIR_NAME = "AnnoDDSPacker"
SETTINGS_FILENAME = "settings.json"


# ─── LODs ─────────────────────────────────────────────────────────────────────

AVAILABLE_LODS: tuple[int, ...] = (0, 1, 2, 3, 4)
MANDATORY_LOD = 0

LOD0_SIZE_AS_INPUT = "AS INPUT"
LOD0_SIZE_OPTIONS: tuple[str, ...] = (LOD0_SIZE_AS_INPUT, "4096", "2048", "1024", "512", "256")


def lod_scale(lod: int) -> int:
    """LOD0=1, LOD1=2, LOD2=4, LOD3=8, LOD4=16. lod0 = full, divide by scale for size."""
    return 1 << lod


# ─── Map types & suffix tables ────────────────────────────────────────────────

# ─── Icon detection ───────────────────────────────────────────────────────────

def is_icon_stem(stem: str) -> bool:
    """Return True if the filename stem identifies a UI icon texture.

    A PNG is treated as an icon when its stem starts with "icon" (case-insensitive).
    Icons bypass all PBR channel-packing logic and are encoded as BC7_UNORM_SRGB
    (DXGI 99) rather than BC7_TYPELESS (DXGI 98).

    Examples: icon_maya_shrine.png → True  |  wall_diff_0.png → False
    """
    return stem.lower().startswith("icon")


# Anno stores UI icons as artwork composited over a solid background colour,
# with the original transparency preserved separately in the alpha channel as
# a mask. Transparent-background icon PNGs are flattened onto this colour while
# their alpha is carried through unchanged.
ICON_BACKGROUND_RGB: tuple[int, int, int] = (0x13, 0x11, 0x11)  # #131111


# ─── Map types & suffix tables ────────────────────────────────────────────────

class MapType(str, Enum):
    DIFF = "diff"
    OPACITY = "opacity"
    METAL = "metal"
    AO = "ao"
    NORM = "norm"
    GLOSS = "gloss"
    ROUGH = "rough"
    HEIGHT = "height"
    RM = "rm"
    ORM = "orm"
    EMISSION = "emission"


# Order matters: longer suffixes must be matched first so '_basecolor' doesn't
# fall into '_color' first. Stripped of leading separator chars at match time.
SUFFIX_MAP: tuple[tuple[str, MapType], ...] = (
    ("basecolor", MapType.DIFF),
    ("ambientocclusion", MapType.AO),
    ("displacement", MapType.HEIGHT),
    ("glossiness", MapType.GLOSS),
    ("roughness", MapType.ROUGH),
    ("metalness", MapType.METAL),
    ("metallic", MapType.METAL),
    ("diffuse", MapType.DIFF),
    ("occlusion", MapType.AO),
    ("opacity", MapType.OPACITY),
    ("albedo", MapType.DIFF),
    ("normal", MapType.NORM),
    ("gloss", MapType.GLOSS),
    ("rough", MapType.ROUGH),
    ("metal", MapType.METAL),
    ("color", MapType.DIFF),
    ("disp", MapType.HEIGHT),
    ("alpha", MapType.OPACITY),
    ("orm", MapType.ORM),
    ("height", MapType.HEIGHT),
    ("diff", MapType.DIFF),
    ("norm", MapType.NORM),
    ("nrm", MapType.NORM),
    ("opc", MapType.OPACITY),
    ("ao", MapType.AO),
    ("bc", MapType.DIFF),
    ("rm", MapType.RM),
    ("emissive", MapType.EMISSION),
    ("emission", MapType.EMISSION),
    ("nightmask", MapType.EMISSION),
)

SEPARATORS = ("_", "-", ".")


# ─── Texture set ──────────────────────────────────────────────────────────────

SYNTHETIC_FLAT_NORMAL = object()  # sentinel; not a Path, not None


@dataclass
class TextureSet:
    base_name: str
    diff: Path | None = None
    opacity: Path | None = None
    metal: Path | None = None
    ao: Path | None = None
    norm: Path | None | object = None  # Path | None | SYNTHETIC_FLAT_NORMAL
    gloss: Path | None = None
    rough: Path | None = None
    height: Path | None = None
    rm: Path | None = None
    orm: Path | None = None
    emission: Path | None = None
    synthetic_flat_normal: bool = False
    is_icon: bool = False   # True → UI icon; encode as BC7_UNORM_SRGB (DXGI 99), no map-type in output name
    warnings: list[str] = field(default_factory=list)

    def has_any(self) -> bool:
        return any(
            v is not None
            for v in (
                self.diff, self.opacity, self.metal, self.ao, self.norm,
                self.gloss, self.rough, self.height, self.rm, self.orm,
                self.emission,
            )
        )

    def primary_thumbnail_source(self) -> Path | None:
        return self.diff or self.rm or self.orm or self.metal or self.norm or self.height or self.emission


# ─── Misc ─────────────────────────────────────────────────────────────────────

DDS_DXGI_FORMAT_OFFSET = 0x80
DDS_DXGI_BC7_TYPELESS = 98    # what Anno ships and the game expects
DDS_DXGI_BC7_UNORM = 99       # what texconv writes; we patch 99 → 98 post-encode

PARALLEL_DEFAULT_CAP = 8
