use std::fs;
use std::path::Path;
use serde::Serialize;

#[derive(Serialize)]
pub struct AudioFile {
    name: String,
    path: String,
    data: Vec<u8>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, &data).map_err(|e| format!("שגיאה בכתיבת קובץ: {}", e))
}

#[tauri::command]
async fn scan_folder(folder_path: String) -> Result<Vec<AudioFile>, String> {
    let path = Path::new(&folder_path);
    
    if !path.exists() {
        return Err("התיקייה לא נמצאה".to_string());
    }

    let audio_extensions = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma", "opus"];
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if file_path.is_file() {
                if let Some(ext) = file_path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if audio_extensions.contains(&ext_str.as_str()) {
                        if let Ok(data) = fs::read(&file_path) {
                            files.push(AudioFile {
                                name: file_path.file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_default(),
                                path: file_path.to_string_lossy().to_string(),
                                data,
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(files)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![greet, scan_folder, write_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
