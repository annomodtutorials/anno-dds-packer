@echo off
REM Close Anno DDS Packer first, then double-click this to install the latest build.
setlocal
cd /d %~dp0
set EXE=src-tauri\target\release\anno-dds-packer.exe
set SIDECAR=src-tauri\binaries\packer-server-x86_64-pc-windows-msvc.exe
set BUNDLE=src-tauri\target\release\bundle\Anno DDS Packer
set PORTABLE=src-tauri\target\release\bundle\portable

REM Kill any lingering packer-server process so the file is not locked
taskkill /im packer-server.exe /f >nul 2>&1
timeout /t 1 /nobreak >nul

copy /y "%EXE%"     "%BUNDLE%\Anno DDS Packer.exe"  >nul && echo OK: exe    updated || echo FAILED: close the app first!
copy /y "%SIDECAR%" "%BUNDLE%\packer-server.exe"     >nul && echo OK: server updated || echo FAILED: still locked!
copy /y "%EXE%"     "%PORTABLE%\Anno DDS Packer.exe" >nul
copy /y "%SIDECAR%" "%PORTABLE%\packer-server.exe"   >nul

echo.
echo Done. You can close this window and reopen Anno DDS Packer.
pause
