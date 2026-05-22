use tauri::State;
use tauri_plugin_dialog::{DialogExt, FilePath};
use crate::AppState;

#[tauri::command]
pub async fn get_packer_port(state: State<'_, AppState>) -> Result<Option<u16>, String> {
    Ok(*state.packer_port.lock().unwrap())
}

#[tauri::command]
pub async fn show_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter(
            "Image files",
            &["png", "jpg", "jpeg", "bmp", "tga", "tif", "tiff", "webp"],
        )
        .pick_files(move |result| {
            let _ = tx.send(result);
        });
    let files = rx.await.map_err(|e| e.to_string())?;
    Ok(files
        .unwrap_or_default()
        .iter()
        .filter_map(|f| {
            if let FilePath::Path(p) = f {
                Some(p.to_string_lossy().to_string())
            } else {
                None
            }
        })
        .collect())
}

#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |result| {
        let _ = tx.send(result);
    });
    let folder = rx.await.map_err(|e| e.to_string())?;
    Ok(folder
        .and_then(|f| {
            if let FilePath::Path(p) = f {
                Some(p.to_string_lossy().to_string())
            } else {
                None
            }
        })
        .unwrap_or_default())
}

#[tauri::command]
pub async fn pick_scan_folder(app: tauri::AppHandle) -> Result<String, String> {
    pick_folder(app).await
}

#[tauri::command]
pub async fn minimize_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn toggle_maximize(window: tauri::WebviewWindow) -> Result<bool, String> {
    let is_max = window.is_maximized().map_err(|e| e.to_string())?;
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())?;
    } else {
        window.maximize().map_err(|e| e.to_string())?;
    }
    Ok(!is_max)
}

#[tauri::command]
pub async fn is_maximized(window: tauri::WebviewWindow) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map(|_| true)
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map(|_| true)
            .map_err(|e| e.to_string())
    }
}
