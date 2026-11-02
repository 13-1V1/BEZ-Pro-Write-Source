// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// App setup plus a tiny file store rooted at the data folder (%APPDATA%\BEZ Pro Write\
// on Windows, ~/Library/Application Support/BEZ Pro Write/ on a Mac).
// The frontend only passes relative paths like "drafts/abc.json"; anything
// that tries to climb out of the data folder is refused.

mod store;

use tauri::Manager;

#[tauri::command]
fn store_root() -> Result<String, String> {
    store::root().map(|p| p.to_string_lossy().into_owned())
}

#[tauri::command]
fn store_read(rel: String) -> Result<Option<String>, String> {
    store::read(&rel)
}

#[tauri::command]
fn store_write(rel: String, content: String) -> Result<(), String> {
    store::write(&rel, &content)
}

#[tauri::command]
fn store_list(dir: String) -> Result<Vec<String>, String> {
    store::list(&dir)
}

#[tauri::command]
fn store_delete(rel: String) -> Result<(), String> {
    store::delete(&rel)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be registered first. A second launch focuses the window that's
        // already open instead of starting another copy that could overwrite drafts.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            store_root,
            store_read,
            store_write,
            store_list,
            store_delete
        ])
        .run(tauri::generate_context!())
        .expect("error while running BEZ Pro Write");
}
