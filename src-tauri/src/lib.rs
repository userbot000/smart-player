use std::fs::{self, File};
use std::io::Read;
use std::path::Path;
use serde::Serialize;

#[derive(Serialize)]
pub struct AudioFile {
    name: String,
    path: String,
    data: Vec<u8>, // Only metadata portion (first 256KB)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, &data).map_err(|e| format!("שגיאה בכתיבת קובץ: {}", e))
}

/// Read a single audio file from disk (for playback)
#[tauri::command]
async fn read_audio_file(file_path: String) -> Result<Vec<u8>, String> {
    let path = Path::new(&file_path);
    
    if !path.exists() {
        return Err(format!("הקובץ לא נמצא: {}", file_path));
    }

    fs::read(&file_path).map_err(|e| format!("שגיאה בקריאת קובץ: {}", e))
}

/// Scan folder for audio files - reads only metadata portion (first 256KB) for fast scanning
#[tauri::command]
async fn scan_folder(folder_path: String) -> Result<Vec<AudioFile>, String> {
    let path = Path::new(&folder_path);
    
    if !path.exists() {
        return Err("התיקייה לא נמצאה".to_string());
    }

    let audio_extensions = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma", "opus"];
    let mut files = Vec::new();
    
    // Read only first 256KB for metadata extraction (much faster!)
    const METADATA_SIZE: usize = 256 * 1024;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if file_path.is_file() {
                if let Some(ext) = file_path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if audio_extensions.contains(&ext_str.as_str()) {
                        // Read only metadata portion
                        if let Ok(mut file) = File::open(&file_path) {
                            let mut buffer = vec![0u8; METADATA_SIZE];
                            let bytes_read = file.read(&mut buffer).unwrap_or(0);
                            buffer.truncate(bytes_read);
                            
                            files.push(AudioFile {
                                name: file_path.file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_default(),
                                path: file_path.to_string_lossy().to_string(),
                                data: buffer,
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
        .invoke_handler(tauri::generate_handler![greet, scan_folder, write_file, read_audio_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
