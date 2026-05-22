"""Thread-safe event bus between worker threads and the Tk main loop.

Workers push ProgressEvents onto a queue.Queue. The Tk main loop drains
the queue every 100 ms via root.after(...) and dispatches events to the
matching QueueRow. Workers MUST NEVER touch Tk widgets directly.
"""
from __future__ import annotations

import logging
import queue
from dataclasses import dataclass
from typing import Callable

log = logging.getLogger(__name__)


# ─── Event payload ──────────────────────────────────────────────────────────

@dataclass
class ProgressEvent:
    """One progress update for a single TextureSet.

    Fields:
      set_id    Unique id of the TextureSet (per-batch monotonic int).
      status    queued | reading | packing | encoding | writing | done | error
      pct       0..100 overall percent for this set.
      label     Human-readable status label (e.g. "ENCODING LOD2").
      eta_s     Estimated seconds remaining, or None.
      maps_done set of map_type strings that finished writing this tick.
      error     Optional error message (if status="error").
    """
    set_id: int
    status: str = "queued"
    pct: float = 0.0
    label: str = ""
    eta_s: float | None = None
    maps_done: tuple[str, ...] = ()
    error: str | None = None
    output_dir: str | None = None


# ─── Event bus ──────────────────────────────────────────────────────────────

class EventBus:
    """Thread-safe pump.

    From worker threads: call .push(event).
    From Tk main: call .install(root, dispatcher) once; the bus then drains
    itself on root.after(100, ...) and calls dispatcher(event) per event.
    """

    POLL_MS = 100

    def __init__(self) -> None:
        self._q: queue.Queue[ProgressEvent] = queue.Queue()
        self._dispatcher: Callable[[ProgressEvent], None] | None = None
        self._after_id: str | None = None
        self._root = None

    def push(self, e: ProgressEvent) -> None:
        self._q.put(e)

    def install(self, root, dispatcher: Callable[[ProgressEvent], None]) -> None:
        self._root = root
        self._dispatcher = dispatcher
        self._schedule()

    def stop(self) -> None:
        self._dispatcher = None
        if self._after_id is not None and self._root is not None:
            try:
                self._root.after_cancel(self._after_id)
            except Exception:
                pass
            self._after_id = None

    def _schedule(self) -> None:
        if self._root is None or self._dispatcher is None:
            return
        self._after_id = self._root.after(self.POLL_MS, self._drain)

    def _drain(self) -> None:
        if self._dispatcher is None:
            return
        try:
            while True:
                e = self._q.get_nowait()
                try:
                    self._dispatcher(e)
                except Exception:
                    log.exception("dispatcher raised on event %s", e)
        except queue.Empty:
            pass
        self._schedule()
