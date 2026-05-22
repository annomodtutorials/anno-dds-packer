@echo off
REM Build the Python packer-server sidecar for Tauri.
REM Output: src-tauri\binaries\packer-server-x86_64-pc-windows-msvc.exe

setlocal
cd /d %~dp0

REM Kill any running instance
taskkill /im packer-server-x86_64-pc-windows-msvc.exe /f >nul 2>&1

REM Compile JSX -> JS (same esbuild from v03 tools)
if exist ..\anno_dds_packer_v03\tools\esbuild.exe (
    ..\anno_dds_packer_v03\tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\parts.js  webui\parts.jsx
    ..\anno_dds_packer_v03\tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\anno.js   webui\anno.jsx
    ..\anno_dds_packer_v03\tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\modern.js webui\modern.jsx
    ..\anno_dds_packer_v03\tools\esbuild.exe --loader:.jsx=jsx --jsx=transform --target=es2020 --outfile=webui\app.js    webui\app.jsx
    echo JSX compiled.
) else (
    echo WARNING: esbuild not found, using pre-compiled JS from v03
    copy /y ..\anno_dds_packer_v03\webui\parts.js  webui\parts.js >nul
    copy /y ..\anno_dds_packer_v03\webui\anno.js   webui\anno.js  >nul
    copy /y ..\anno_dds_packer_v03\webui\modern.js webui\modern.js >nul
    copy /y ..\anno_dds_packer_v03\webui\app.js    webui\app.js   >nul
)

python -m pip install --quiet -r packer\requirements.txt

if exist build_packer rmdir /s /q build_packer
python -m PyInstaller --clean --noconfirm --onefile --name packer-server ^
    --add-binary "tools\texconv.exe;tools" ^
    --hidden-import=uvicorn.logging --hidden-import=uvicorn.loops ^
    --hidden-import=uvicorn.loops.auto --hidden-import=uvicorn.protocols ^
    --hidden-import=uvicorn.protocols.http --hidden-import=uvicorn.protocols.http.auto ^
    --hidden-import=uvicorn.protocols.websockets ^
    --hidden-import=uvicorn.protocols.websockets.auto ^
    --hidden-import=uvicorn.lifespan --hidden-import=uvicorn.lifespan.on ^
    --hidden-import=anyio --hidden-import=starlette ^
    --hidden-import=fastapi --hidden-import=sse_starlette ^
    --distpath build_packer\dist ^
    packer\server.py
if errorlevel 1 (
    echo PyInstaller failed.
    exit /b 1
)

if not exist src-tauri\binaries mkdir src-tauri\binaries
copy /y "build_packer\dist\packer-server.exe" "src-tauri\binaries\packer-server-x86_64-pc-windows-msvc.exe"
if errorlevel 1 ( echo Copy failed. & exit /b 1 )

echo.
echo Packer sidecar built: src-tauri\binaries\packer-server-x86_64-pc-windows-msvc.exe
endlocal
