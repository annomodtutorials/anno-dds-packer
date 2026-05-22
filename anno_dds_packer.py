"""Anno DDS Packer — PySide6 + QWebEngineView shell.

The previous pywebview/WebView2 shell couldn't recover real disk paths from
drag-drop into the React UI: Chromium's renderer runs in a subprocess and
its IDropTarget intercepts drops before our IDropTarget on the parent HWND
gets a chance. Workarounds (cross-process EXSTYLE toggle, --single-process
WebView2) either don't take effect or are filtered by WebView2.

PySide6 + QWebEngineView solves this cleanly: Qt's QWebEngineView is a
QWidget that participates in Qt's drag-drop pipeline BEFORE the embedded
Chromium even sees the event. We override dragEnterEvent/dropEvent on the
view, read QMimeData.urls(), and get real local file paths.

Bridge: a QObject with @Slot-decorated methods is exposed via QWebChannel
under window.bridge in JS. A tiny shim in index.html maps the legacy
window.pywebview.api.method(...) Promise calls onto window.bridge.method(...
callback), so the React code keeps working unchanged.

Architecture:
- QApplication + QMainWindow
- DropAwareWebView (subclass of QWebEngineView) overrides drag events
- QWebChannel publishes the Bridge QObject as "bridge"
- Bridge owns the worker thread for packer.convert_sets_parallel
- Progress events from the worker are marshaled to the UI thread via a Qt
  signal, then pushed to JS via QWebEnginePage.runJavaScript
"""
from __future__ import annotations

import argparse
import ctypes
import logging
import os
import sys
from pathlib import Path

from PySide6.QtCore import (
    QEasingCurve, QPropertyAnimation, QUrl, Qt, Slot, QTimer,
)
from PySide6.QtGui import (
    QColor, QDragEnterEvent, QDragMoveEvent, QDragLeaveEvent, QDropEvent,
    QFont, QIcon, QPalette, QPixmap,
)
from PySide6.QtWidgets import (
    QApplication, QGraphicsOpacityEffect,
    QLabel, QMainWindow, QVBoxLayout, QWidget,
)
from PySide6.QtWebChannel import QWebChannel
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEngineSettings, QWebEnginePage

from bridge import Bridge
from config import app_base_dir

log = logging.getLogger(__name__)

WIN_W = 1600
WIN_H = 1000
MIN_W = 1280
MIN_H = 800

# WM_SIZING constants — for the live-resize aspect-ratio lock implemented in
# MainWindow.nativeEvent. wParam tells us which edge the user is dragging.
WM_SIZING = 0x0214
WMSZ_LEFT = 1
WMSZ_RIGHT = 2
WMSZ_TOP = 3
WMSZ_TOPLEFT = 4
WMSZ_TOPRIGHT = 5
WMSZ_BOTTOM = 6
WMSZ_BOTTOMLEFT = 7
WMSZ_BOTTOMRIGHT = 8


def _set_dpi_awareness() -> None:
    """Tell Windows we handle DPI scaling ourselves (Qt does, given the
    AA_EnableHighDpiScaling attribute set in main)."""
    if sys.platform != "win32":
        return
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except (OSError, AttributeError):
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except (OSError, AttributeError):
            pass


class SplashWidget(QWidget):
    """Full-size overlay painted on top of the WebView while Chromium boots.

    Lives as a child of MainWindow (not in a QStackedWidget — that would
    hide the WebView and prevent JS from running). The WebView is always
    the centralWidget so Chromium executes JS normally. This widget simply
    floats on top via raise_() and is faded out once React signals ready.
    """

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setAutoFillBackground(True)
        pal = self.palette()
        pal.setColor(QPalette.ColorRole.Window, QColor("#0B1828"))
        self.setPalette(pal)

        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.setSpacing(24)
        layout.setContentsMargins(0, 0, 0, 0)

        logo_label = QLabel(self)
        logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo_path = app_base_dir() / "webui" / "assets" / "anno_brand_logo.png"
        if logo_path.exists():
            pix = QPixmap(str(logo_path)).scaled(
                96, 96,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )
            logo_label.setPixmap(pix)
        layout.addWidget(logo_label, 0, Qt.AlignmentFlag.AlignCenter)

        text = QLabel("LOADING…", self)
        text.setAlignment(Qt.AlignmentFlag.AlignCenter)
        text.setStyleSheet(
            "QLabel {"
            "  color: #C9A152;"
            "  font-family: 'Cinzel', 'Segoe UI', sans-serif;"
            "  font-size: 14px;"
            "  font-weight: 600;"
            "  letter-spacing: 4px;"
            "}"
        )
        layout.addWidget(text, 0, Qt.AlignmentFlag.AlignCenter)


class LoggingPage(QWebEnginePage):
    """QWebEnginePage that forwards JS console.* messages to Python's
    logging so we can see them in the same log file as Python-side messages."""

    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):  # noqa: N802
        log.info("[js] %s", message)


class DropAwareWebView(QWebEngineView):
    """QWebEngineView that intercepts file drops at the Qt layer and forwards
    the real disk paths to the Python bridge, then lets the event propagate
    so HTML5 drag visuals still fire (the React code uses dragover as a
    visual hint).
    """

    def __init__(self, bridge: Bridge, parent=None):
        super().__init__(parent)
        self._bridge = bridge
        # Qt's QWebEngineView delegates many events to an internal focusProxy
        # widget (the native Chromium HWND). Setting acceptDrops on the view
        # alone isn't enough — Qt routes the drag events through the proxy.
        # We accept on both AND on the main window for safety.
        self.setAcceptDrops(True)

    # — Drag events fired by Qt before Chromium even sees the drop —
    #
    # In addition to capturing file paths on drop, we also drive the React
    # UI's "drag-over visual" state (purple/gold tinted overlay) by calling
    # window.__nativeDragEnter() / __nativeDragLeave() on the JS side. The
    # HTML5 dragover event no longer fires inside the WebEngine because Qt
    # consumes the OS-level drag before Chromium sees it.

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:  # noqa: N802
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            log.info("drag enter with %d url(s)", len(event.mimeData().urls()))
            self._bridge._call_js("window.__nativeDragEnter && window.__nativeDragEnter();")
        else:
            super().dragEnterEvent(event)

    def dragMoveEvent(self, event: QDragMoveEvent) -> None:  # noqa: N802
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
        else:
            super().dragMoveEvent(event)

    def dragLeaveEvent(self, event: QDragLeaveEvent) -> None:  # noqa: N802
        # Cursor left the window (without dropping) — clear the visual state.
        self._bridge._call_js("window.__nativeDragLeave && window.__nativeDragLeave();")
        super().dragLeaveEvent(event)

    def dropEvent(self, event: QDropEvent) -> None:  # noqa: N802
        if not event.mimeData().hasUrls():
            super().dropEvent(event)
            return
        paths: list[str] = []
        for url in event.mimeData().urls():
            if url.isLocalFile():
                paths.append(url.toLocalFile())
        if paths:
            log.info("drop fired with %d real path(s); first: %s",
                     len(paths), paths[0])
            event.acceptProposedAction()
            # Clear the visual state immediately; the post-drop UI flip to
            # the queue page will happen once scan_paths returns.
            self._bridge._call_js("window.__nativeDragLeave && window.__nativeDragLeave();")
            # Forward to the React side. The bridge marshals onto the UI
            # thread before calling runJavaScript.
            self._bridge.native_drop(paths)
        else:
            super().dropEvent(event)


class MainWindow(QMainWindow):
    """Top-level window. Also overrides drag events to catch drops that
    Qt might route to the window-level proxy rather than the view."""

    def __init__(self, bridge: Bridge):
        super().__init__()
        self._bridge = bridge
        self.setWindowTitle("Anno DDS Packer")
        self.setMinimumSize(MIN_W, MIN_H)
        self.resize(WIN_W, WIN_H)
        self.setAcceptDrops(True)

        # Aspect-ratio lock: the WM_SIZING handler in nativeEvent constrains
        # the CLIENT area to this ratio during user resize. We measure the
        # non-client offset (title bar + borders) lazily in showEvent.
        self._target_client_ratio = WIN_W / WIN_H
        self._nc_w = 0
        self._nc_h = 0

        # Icon (if available)
        ico = app_base_dir() / "webui" / "assets" / "anno_dds_packer.ico"
        if ico.exists():
            self.setWindowIcon(QIcon(str(ico)))

        # Navy background on every layer so no white ever leaks through.
        self.setStyleSheet("QMainWindow { background-color: #0B1828; }")

        # WebView is ALWAYS the centralWidget — never hidden in a stack.
        # Chromium must be visible so JS executes and QWebChannel connects.
        self.view = DropAwareWebView(bridge, self)
        page = LoggingPage(self.view)
        page.setBackgroundColor(QColor("#0B1828"))
        self.view.setPage(page)
        self.view.setStyleSheet("background-color: #0B1828;")
        self.view.setContentsMargins(0, 0, 0, 0)
        self.setCentralWidget(self.view)

        # SplashWidget floats on top of the WebView as a child overlay.
        # It's raised above the WebView so the user sees it first, but the
        # WebView underneath is always active and running JS.
        self.splash = SplashWidget(self)
        self.splash.setGeometry(self.rect())
        self.splash.raise_()
        self.splash.show()

        # Fade the splash out once React signals its first painted frame.
        bridge.app_ready.connect(self._on_app_ready, Qt.ConnectionType.QueuedConnection)

        # Safety: if notify_ready never arrives, fade out after 20 s.
        # Cold-start can take > 10 s when Chromium JITs from scratch.
        self._splash_timer = QTimer(self)
        self._splash_timer.setSingleShot(True)
        self._splash_timer.timeout.connect(self._on_splash_timeout)
        self._splash_timer.start(20_000)

        # Tune Chromium settings
        s = self.view.settings()
        s.setAttribute(QWebEngineSettings.LocalContentCanAccessRemoteUrls, True)
        s.setAttribute(QWebEngineSettings.LocalContentCanAccessFileUrls, True)
        s.setAttribute(QWebEngineSettings.JavascriptCanAccessClipboard, True)
        s.setAttribute(QWebEngineSettings.AllowRunningInsecureContent, True)

        # Wire the bridge to the page via QWebChannel BEFORE loading the page,
        # so the JS-side shim can find it immediately.
        self.channel = QWebChannel(self.view.page())
        self.channel.registerObject("bridge", bridge)
        self.view.page().setWebChannel(self.channel)

        # Hook the bridge to this page so it can runJavaScript
        bridge._attach_page(self.view.page())

        # Load the React UI
        index = app_base_dir() / "webui" / "index.html"
        if not index.exists():
            log.error("webui/index.html not found at %s", index)
        self.view.load(QUrl.fromLocalFile(str(index)))

    @Slot()
    def _on_app_ready(self) -> None:
        """React has painted its first frame — fade the splash out smoothly."""
        if self.splash.isHidden():
            return
        self._splash_timer.stop()
        log.info("UI: app ready, fading out splash")
        self._fade_splash()

    @Slot()
    def _on_splash_timeout(self) -> None:
        """20 s safety net — fade out if notify_ready never fired.

        Uses the same _fade_splash() path as the normal ready signal so there
        is no jarring instant hide / flash regardless of the root cause.
        """
        if self.splash.isHidden():
            return
        log.warning("UI: splash timeout — notify_ready never arrived; fading now")
        self._fade_splash()

    def _fade_splash(self) -> None:
        """Animate the splash overlay from opaque → transparent, then hide.

        Uses a slow InQuart ease-in curve over 600 ms so the splash stays
        nearly fully opaque for the first ~300 ms. This covers the gap
        between the JS double-rAF firing and Chromium actually compositing
        all layers to the screen — preventing any "blue background" flash
        from showing through a prematurely-transparent splash.

        InQuart opacity profile (600 ms total):
          100 ms → 99.9 % opaque   (browser is finishing its paint)
          300 ms → 93.8 % opaque   (app content fully on screen by now)
          450 ms → 68.0 % opaque   (fade becoming visible)
          600 ms →  0.0 % opaque   (done)
        """
        effect = QGraphicsOpacityEffect(self.splash)
        self.splash.setGraphicsEffect(effect)
        anim = QPropertyAnimation(effect, b"opacity", self)
        anim.setDuration(600)
        anim.setStartValue(1.0)
        anim.setEndValue(0.0)
        anim.setEasingCurve(QEasingCurve.Type.InQuart)

        def _done():
            self.splash.hide()
            self.splash.setGraphicsEffect(None)
            self.view.setFocus()

        anim.finished.connect(_done)
        anim.start(QPropertyAnimation.DeletionPolicy.DeleteWhenStopped)
        self._splash_anim = anim   # keep ref so GC doesn't kill it mid-flight

    def resizeEvent(self, event) -> None:  # noqa: N802
        """Keep the splash overlay covering the full client area on resize."""
        super().resizeEvent(event)
        if hasattr(self, "splash") and not self.splash.isHidden():
            cw = self.centralWidget()
            self.splash.setGeometry(cw.geometry() if cw else self.rect())

    # — Window-level drag events as a fallback (also drive hover state) —

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:  # noqa: N802
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
            self._bridge._call_js("window.__nativeDragEnter && window.__nativeDragEnter();")
        else:
            super().dragEnterEvent(event)

    def dragMoveEvent(self, event: QDragMoveEvent) -> None:  # noqa: N802
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
        else:
            super().dragMoveEvent(event)

    def dragLeaveEvent(self, event: QDragLeaveEvent) -> None:  # noqa: N802
        self._bridge._call_js("window.__nativeDragLeave && window.__nativeDragLeave();")
        super().dragLeaveEvent(event)

    def dropEvent(self, event: QDropEvent) -> None:  # noqa: N802
        if not event.mimeData().hasUrls():
            super().dropEvent(event)
            return
        paths = [u.toLocalFile() for u in event.mimeData().urls() if u.isLocalFile()]
        if paths:
            event.acceptProposedAction()
            self._bridge._call_js("window.__nativeDragLeave && window.__nativeDragLeave();")
            self._bridge.native_drop(paths)
        else:
            super().dropEvent(event)

    # — Aspect-ratio lock via Win32 WM_SIZING (live-resize constraint) —

    def showEvent(self, event) -> None:  # noqa: N802
        super().showEvent(event)
        # Measure non-client offset once after the HWND exists. We do this
        # here (rather than __init__) because the native window isn't
        # created until show(). The WM_SIZING handler needs the offset to
        # convert proposed-window-rect → client-rect during live resize.
        if sys.platform != "win32" or (self._nc_w and self._nc_h):
            return
        try:
            from ctypes import wintypes
            user32 = ctypes.WinDLL("user32")
            user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.RECT)]
            user32.GetClientRect.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.RECT)]
            hwnd = int(self.winId())
            wr = wintypes.RECT(); cr = wintypes.RECT()
            user32.GetWindowRect(hwnd, ctypes.byref(wr))
            user32.GetClientRect(hwnd, ctypes.byref(cr))
            self._nc_w = max(0, (wr.right - wr.left) - (cr.right - cr.left))
            self._nc_h = max(0, (wr.bottom - wr.top) - (cr.bottom - cr.top))
            log.info("non-client offset: %d x %d (title bar + borders)",
                     self._nc_w, self._nc_h)
            # Snap the initial CLIENT area to WIN_W × WIN_H. QWidget.resize
            # takes client dims for top-level widgets (the frame is added on
            # automatically by the OS). The earlier "+ nc_w / + nc_h" was
            # wrong and caused vertical letterboxing on first paint until
            # the user resized and WM_SIZING re-snapped to ratio.
            self.resize(WIN_W, WIN_H)
            log.info("snapped initial client size to %dx%d", WIN_W, WIN_H)
        except Exception:
            log.exception("nc offset measure failed")

    def nativeEvent(self, eventType, message):  # noqa: N802
        """Constrain the window's CLIENT area to a 16:10 ratio during user
        resize by modifying the WM_SIZING RECT in place."""
        if sys.platform == "win32" and eventType == b"windows_generic_MSG":
            try:
                from ctypes import wintypes
                msg = wintypes.MSG.from_address(int(message))
                if msg.message == WM_SIZING and msg.lParam and self._nc_w + self._nc_h > 0:
                    rect = wintypes.RECT.from_address(msg.lParam)
                    ww = rect.right - rect.left
                    wh = rect.bottom - rect.top
                    cw = ww - self._nc_w
                    ch = wh - self._nc_h
                    if cw > 0 and ch > 0:
                        cur_ratio = cw / ch
                        edge = msg.wParam
                        target = self._target_client_ratio
                        if cur_ratio > target:
                            # too wide → grow client height to match
                            new_ch = int(round(cw / target))
                            new_wh = new_ch + self._nc_h
                            if edge in (WMSZ_TOP, WMSZ_TOPLEFT, WMSZ_TOPRIGHT):
                                rect.top = rect.bottom - new_wh
                            else:
                                rect.bottom = rect.top + new_wh
                        else:
                            new_cw = int(round(ch * target))
                            new_ww = new_cw + self._nc_w
                            if edge in (WMSZ_LEFT, WMSZ_TOPLEFT, WMSZ_BOTTOMLEFT):
                                rect.left = rect.right - new_ww
                            else:
                                rect.right = rect.left + new_ww
                        return True, 1  # handled, return TRUE per WM_SIZING docs
            except Exception:
                log.exception("WM_SIZING handler failed")
        return super().nativeEvent(eventType, message)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    ap = argparse.ArgumentParser()
    ap.add_argument("--debug", action="store_true",
                    help="Open the WebEngine remote-debugging port on 9222")
    args = ap.parse_args()

    _set_dpi_awareness()

    if args.debug:
        os.environ.setdefault("QTWEBENGINE_REMOTE_DEBUGGING", "9222")

    app = QApplication(sys.argv)
    app.setApplicationName("Anno DDS Packer")

    bridge = Bridge()
    win = MainWindow(bridge)
    win.show()
    # Force an immediate paint so the SplashWidget overlay is drawn in the
    # very first frame the user sees — before the event loop has a chance
    # to yield to Chromium's startup work.
    app.processEvents()

    log.info("UI: window shown at %dx%d", win.width(), win.height())
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
