"""Settings persistence to %APPDATA%/AnnoDDSPacker/settings.json.

Reads with utf-8-sig so PowerShell-written UTF-8 BOMs don't break parsing.
Writes plain utf-8 without BOM.
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path

from config import APPDATA_DIR_NAME, AVAILABLE_LODS, LOD0_SIZE_AS_INPUT, SETTINGS_FILENAME

log = logging.getLogger(__name__)


def settings_dir() -> Path:
    base = os.environ.get("APPDATA") or os.path.expanduser("~")
    return Path(base) / APPDATA_DIR_NAME


def settings_path() -> Path:
    return settings_dir() / SETTINGS_FILENAME


@dataclass
class Settings:
    output_dir: str = ""
    same_as_input: bool = True
    fast_mode: bool = True   # always-on; toggle removed from UI
    selected_lods: list[int] = field(default_factory=lambda: [0])
    lod0_size: str = LOD0_SIZE_AS_INPUT
    theme_name: str = "anno"
    parallel_sets_max: int | None = None  # None → auto = min(cpu_count(), 8)

    def __post_init__(self) -> None:
        # Defensive normalisation against malformed json
        self.selected_lods = sorted({int(n) for n in (self.selected_lods or [0]) if int(n) in AVAILABLE_LODS}) or [0]
        if 0 not in self.selected_lods:
            self.selected_lods = sorted({0, *self.selected_lods})
        if self.theme_name not in ("anno", "modern"):
            self.theme_name = "anno"


_KNOWN_FIELDS = {f.name for f in fields(Settings)}


def load() -> Settings:
    p = settings_path()
    if not p.exists():
        return Settings()
    try:
        with p.open("r", encoding="utf-8-sig") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            log.warning("settings.json root was not a dict; using defaults")
            return Settings()
        filtered = {k: v for k, v in data.items() if k in _KNOWN_FIELDS}
        return Settings(**filtered)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as e:
        log.warning("settings.json read failed: %s; using defaults", e)
        return Settings()


def save(s: Settings) -> None:
    p = settings_path()
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("w", encoding="utf-8") as fh:
            json.dump(asdict(s), fh, indent=2)
    except OSError as e:
        log.warning("settings.json write failed: %s", e)
