@echo off
REM Full build: packer sidecar + Tauri app.
setlocal
cd /d %~dp0

set "PATH=%USERPROFILE%\.cargo\bin;%APPDATA%\npm;%PATH%"

call build_packer.bat
if errorlevel 1 exit /b 1

tauri build
if errorlevel 1 (
    echo Tauri build failed.
    exit /b 1
)

REM ── Build portable zip ───────────────────────────────────────────────
set "RELEASE=src-tauri\target\release"
set "PORTABLE_DIR=%RELEASE%\bundle\Anno DDS Packer"
set "ZIP_OUT=%RELEASE%\bundle\Anno DDS Packer_1.1.0_x64_portable.zip"

if exist "%PORTABLE_DIR%" rd /s /q "%PORTABLE_DIR%"
mkdir "%PORTABLE_DIR%"
copy /y "%RELEASE%\anno-dds-packer.exe" "%PORTABLE_DIR%\Anno DDS Packer.exe" >nul
copy /y "%RELEASE%\packer-server.exe"   "%PORTABLE_DIR%\packer-server.exe" >nul
if exist "%ZIP_OUT%" del /f /q "%ZIP_OUT%"

powershell -NoProfile -Command ^
  "Add-Type -A System.IO.Compression.FileSystem;" ^
  "[IO.Compression.ZipFile]::CreateFromDirectory('%PORTABLE_DIR%','%ZIP_OUT%',[IO.Compression.CompressionLevel]::Optimal,$true)"

echo.
echo Build complete:
echo   Installer: %RELEASE%\bundle\nsis\Anno DDS Packer_1.1.0_x64-setup.exe
echo   Portable:  %ZIP_OUT%
endlocal
