// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

pub struct AppState {
    pub packer_port: Arc<Mutex<Option<u16>>>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            packer_port: Arc::new(Mutex::new(None)),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            let state: tauri::State<AppState> = app.state();
            let port_ref = state.packer_port.clone();

            // Kill any stale packer-server.exe left from a previous launch so
            // we always get port 45291 (avoids race where old instance holds the
            // fixed port and the new one falls back to a random port the TCP
            // poller never checks).
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/IM", "packer-server.exe"])
                    .creation_flags(0x08000000) // CREATE_NO_WINDOW
                    .output();
                // Brief pause so the OS releases the socket before we spawn fresh.
                std::thread::sleep(std::time::Duration::from_millis(600));
            }

            // Spawn Python packer-server sidecar
            let sidecar_cmd = app_handle
                .shell()
                .sidecar("packer-server")
                .expect("packer-server sidecar not found");

            let (mut rx, _child) = sidecar_cmd
                .spawn()
                .expect("failed to spawn packer-server");

            let port_ref2 = port_ref.clone();
            let app_handle2 = app_handle.clone();

            // Belt-and-suspenders: still read stdout in case packer-server
            // signals a non-default port; primary detection is TCP poll below.
            tauri::async_runtime::spawn(async move {
                use tauri::Emitter;
                while let Some(event) = rx.recv().await {
                    match event {
                        tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                            let text = String::from_utf8_lossy(&line);
                            if let Some(stripped) = text.trim().strip_prefix("PORT=") {
                                if let Ok(port) = stripped.parse::<u16>() {
                                    *port_ref2.lock().unwrap() = Some(port);
                                    // Emit so JS knows which port to use if it differs
                                    app_handle2.emit("packer-ready", port).ok();
                                }
                            }
                        }
                        tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                            eprintln!("[packer] {}", String::from_utf8_lossy(&line));
                        }
                        _ => {}
                    }
                }
            });

            // Primary detection: poll the fixed port via native TCP connect so we
            // never depend on the WebView being able to reach http://127.0.0.1.
            // This task runs in Rust/tokio — no browser networking involved.
            let app_handle3 = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                use tauri::Emitter;
                use tokio::net::TcpStream;
                use tokio::time::{sleep, Duration};

                const FIXED_PORT: u16 = 45291;

                // Wait for the WebView to initialise and register its
                // packer-ready listener before we could ever fire the event.
                // Without this, if the port is already occupied by a prior
                // run, Rust would detect it in the first 200 ms poll —
                // before the JS listener is registered — and the event
                // would be silently dropped.
                sleep(Duration::from_secs(2)).await;

                // Poll every 200 ms for up to 60 s
                for _ in 0u32..290 {
                    sleep(Duration::from_millis(200)).await;
                    if TcpStream::connect(("127.0.0.1", FIXED_PORT)).await.is_ok() {
                        app_handle3.emit("packer-ready", FIXED_PORT).ok();
                        break;
                    }
                }
            });

            // Note: Tauri 2 automatically emits tauri://drag-enter, tauri://drag-drop,
            // tauri://drag-leave events to the webview — no manual wiring needed.

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_packer_port,
            commands::pick_files,
            commands::pick_folder,
            commands::pick_scan_folder,
            commands::open_folder,
            commands::show_window,
            commands::minimize_window,
            commands::toggle_maximize,
            commands::is_maximized,
            commands::close_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
