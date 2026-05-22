"""Best-effort VRAM probe via pynvml (NVIDIA).

Falls back to (None, None) on AMD/Intel/no driver — the footer then renders
"— / — GB" instead of a live value.
"""
from __future__ import annotations

import logging

log = logging.getLogger(__name__)


_BYTES_PER_GB = 1024 ** 3
_pynvml = None
_initialised = False
_init_failed = False
_handle = None


def _try_init() -> bool:
    global _pynvml, _initialised, _init_failed, _handle
    if _initialised:
        return True
    if _init_failed:
        return False
    try:
        import pynvml  # type: ignore
        pynvml.nvmlInit()
        if pynvml.nvmlDeviceGetCount() == 0:
            _init_failed = True
            return False
        _handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        _pynvml = pynvml
        _initialised = True
        log.info("pynvml initialised; primary device handle acquired")
        return True
    except Exception as e:
        log.info("pynvml init failed (%s); VRAM probing disabled", e)
        _init_failed = True
        return False


def vram_gb() -> tuple[float | None, float | None]:
    """Return (used_GB, total_GB). Either may be None if probing unavailable."""
    if not _try_init():
        return (None, None)
    try:
        info = _pynvml.nvmlDeviceGetMemoryInfo(_handle)
        return (info.used / _BYTES_PER_GB, info.total / _BYTES_PER_GB)
    except Exception as e:
        log.debug("pynvml read failed: %s", e)
        return (None, None)


def shutdown() -> None:
    global _initialised, _handle, _pynvml
    if _pynvml is not None:
        try:
            _pynvml.nvmlShutdown()
        except Exception:
            pass
    _initialised = False
    _handle = None
    _pynvml = None
