@echo off
REM Build AnnoDDSPacker.exe (PySide6 + QtWebEngine edition).
REM
REM Output: dist\AnnoDDSPacker\AnnoDDSPacker.exe (onedir mode).
REM Bundles webui/ + tools\texconv.exe + the PySide6 Qt6 runtime
REM (QtWebEngineProcess.exe + Qt resources).

setlocal
cd /d %~dp0

REM Kill any running instance so PyInstaller can overwrite the locked .exe.
taskkill /im AnnoDDSPacker.exe /f >nul 2>&1

REM ---  Pre-compile JSX -> JS via esbuild  ---
REM Saves ~3 MB of babel-standalone runtime + ~3 s parse time at startup.
if not exist tools\esbuild.exe (
    echo ERROR: tools\esbuild.exe missing. The JSX precompile step needs it.
    exit /b 1
)
tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\parts.js  webui\parts.jsx
if errorlevel 1 exit /b 1
tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\anno.js   webui\anno.jsx
if errorlevel 1 exit /b 1
tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\modern.js webui\modern.jsx
if errorlevel 1 exit /b 1
tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\app.js    webui\app.jsx
if errorlevel 1 exit /b 1
echo JSX precompiled.

python -m pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    python -m pip install --upgrade pyinstaller
)

python -m pip show PySide6 >nul 2>&1
if errorlevel 1 (
    echo Installing PySide6...
    python -m pip install --upgrade PySide6
)

if exist build rmdir /s /q build
if exist dist  rmdir /s /q dist

python -m PyInstaller --clean --noconfirm anno_dds_packer.spec
if errorlevel 1 (
    echo PyInstaller failed.
    exit /b 1
)

REM --- Prune unused PySide6 modules (QML, non-en locales, debug paks, etc.) ---
REM Frees ~225 MB by removing files PySide6's PyInstaller hook ships by
REM default but which this app never touches.
python _trim_bundle.py dist\AnnoDDSPacker
if errorlevel 1 (
    echo Bundle trim failed; build still usable but oversized.
)

echo.
echo ----------------------------------------------------------
echo Build complete (onedir): dist\AnnoDDSPacker\AnnoDDSPacker.exe
for %%I in (dist\AnnoDDSPacker\AnnoDDSPacker.exe) do echo Exe size: %%~zI bytes
echo Distribute the entire dist\AnnoDDSPacker\ folder.
echo ----------------------------------------------------------
endlocal
