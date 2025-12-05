use std::fs::{self, File};
use std::io::Read;
use std::path::Path;
use std::sync::Mutex;
use serde::Serialize;
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use serde_json;

#[derive(Serialize)]
pub struct AudioFile {
    name: String,
    path: String,
    data: Vec<u8>, // Only metadata portion (first 256KB)
}

// Store for files opened via command line / file association
static PENDING_FILES: Mutex<Vec<String>> = Mutex::new(Vec::new());

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

/// Scan folder for audio files recursively with progress updates
#[tauri::command]
async fn scan_folder(folder_path: String, app_handle: tauri::AppHandle) -> Result<Vec<AudioFile>, String> {
    let path = Path::new(&folder_path);
    
    if !path.exists() {
        return Err("התיקייה לא נמצאה".to_string());
    }

    let audio_extensions = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma", "opus"];
    let mut files = Vec::new();
    
    // Read only first 256KB for metadata extraction (much faster!)
    const METADATA_SIZE: usize = 256 * 1024;
    const BATCH_SIZE: usize = 10; // Process in batches of 10 files

    // First pass: count total files for progress tracking
    let total_files = count_audio_files(&path, &audio_extensions);
    let _ = app_handle.emit("scan-progress", serde_json::json!({
        "phase": "counting",
        "total": total_files,
        "processed": 0,
        "current_file": ""
    }));

    // Recursive function to scan directories with progress
    fn scan_dir_recursive(
        dir: &Path,
        audio_extensions: &[&str],
        files: &mut Vec<AudioFile>,
        metadata_size: usize,
        processed: &mut usize,
        total: usize,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), String> {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let file_path = entry.path();
                
                // If it's a directory, scan it recursively
                if file_path.is_dir() {
                    // Skip hidden folders and system folders
                    if let Some(folder_name) = file_path.file_name() {
                        let name = folder_name.to_string_lossy();
                        if !name.starts_with('.') && name != "System Volume Information" && name != "$RECYCLE.BIN" {
                            let _ = scan_dir_recursive(&file_path, audio_extensions, files, metadata_size, processed, total, app_handle);
                        }
                    }
                }
                // If it's a file, check if it's an audio file
                else if file_path.is_file() {
                    if let Some(ext) = file_path.extension() {
                        let ext_str = ext.to_string_lossy().to_lowercase();
                        if audio_extensions.contains(&ext_str.as_str()) {
                            // Read only metadata portion
                            if let Ok(mut file) = File::open(&file_path) {
                                let mut buffer = vec![0u8; metadata_size];
                                let bytes_read = file.read(&mut buffer).unwrap_or(0);
                                buffer.truncate(bytes_read);
                                
                                files.push(AudioFile {
                                    name: file_path.file_name()
                                        .map(|n| n.to_string_lossy().to_string())
                                        .unwrap_or_default(),
                                    path: file_path.to_string_lossy().to_string(),
                                    data: buffer,
                                });

                                *processed += 1;

                                // Send progress update every BATCH_SIZE files
                                if *processed % BATCH_SIZE == 0 || *processed == total {
                                    let _ = app_handle.emit("scan-progress", serde_json::json!({
                                        "phase": "scanning",
                                        "total": total,
                                        "processed": *processed,
                                        "current_file": file_path.file_name()
                                            .map(|n| n.to_string_lossy().to_string())
                                            .unwrap_or_default()
                                    }));
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    let mut processed = 0;
    scan_dir_recursive(path, &audio_extensions, &mut files, METADATA_SIZE, &mut processed, total_files, &app_handle)?;

    // Final progress update
    let _ = app_handle.emit("scan-progress", serde_json::json!({
        "phase": "complete",
        "total": total_files,
        "processed": processed,
        "current_file": ""
    }));

    Ok(files)
}

/// Count audio files in directory (for progress tracking)
fn count_audio_files(dir: &Path, audio_extensions: &[&str]) -> usize {
    let mut count = 0;
    
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            
            if file_path.is_dir() {
                if let Some(folder_name) = file_path.file_name() {
                    let name = folder_name.to_string_lossy();
                    if !name.starts_with('.') && name != "System Volume Information" && name != "$RECYCLE.BIN" {
                        count += count_audio_files(&file_path, audio_extensions);
                    }
                }
            } else if file_path.is_file() {
                if let Some(ext) = file_path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if audio_extensions.contains(&ext_str.as_str()) {
                        count += 1;
                    }
                }
            }
        }
    }
    
    count
}

/// Get files that were opened via command line / file association
#[tauri::command]
fn get_pending_files() -> Vec<String> {
    let mut files = PENDING_FILES.lock().unwrap();
    let result = files.clone();
    files.clear();
    result
}

/// Switch to mini player mode
#[tauri::command]
async fn switch_to_mini_player(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Hide main window
    if let Some(main_window) = app_handle.get_webview_window("main") {
        main_window.hide().map_err(|e| e.to_string())?;
    }

    // Check if mini player already exists
    if let Some(mini_window) = app_handle.get_webview_window("mini-player") {
        mini_window.show().map_err(|e| e.to_string())?;
        mini_window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    // Get screen size to position window at bottom-right
    let mini_window = WebviewWindowBuilder::new(
        &app_handle,
        "mini-player",
        WebviewUrl::App("mini-player.html".into())
    )
    .title("Mini Player")
    .inner_size(420.0, 90.0)
    .min_inner_size(350.0, 80.0)
    .resizable(true)
    .decorations(false)
    .transparent(false)
    .always_on_top(true)
    .skip_taskbar(false)
    .build()
    .map_err(|e| e.to_string())?;

    // Position at bottom-right of screen
    if let Ok(monitor) = mini_window.current_monitor() {
        if let Some(monitor) = monitor {
            let screen_size = monitor.size();
            let window_size = mini_window.outer_size().unwrap_or(tauri::PhysicalSize::new(420, 90));
            let x = screen_size.width as i32 - window_size.width as i32 - 20;
            let y = screen_size.height as i32 - window_size.height as i32 - 60;
            let _ = mini_window.set_position(tauri::PhysicalPosition::new(x, y));
        }
    }

    mini_window.set_focus().map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Switch back to main window from mini player
#[tauri::command]
async fn switch_to_main_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    // Hide mini player
    if let Some(mini_window) = app_handle.get_webview_window("mini-player") {
        mini_window.hide().map_err(|e| e.to_string())?;
    }

    // Show main window
    if let Some(main_window) = app_handle.get_webview_window("main") {
        main_window.show().map_err(|e| e.to_string())?;
        main_window.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Check if a file is an audio file
fn is_audio_file(path: &str) -> bool {
    let audio_extensions = ["mp3", "wav", "flac", "ogg", "m4a", "aac", "wma", "opus"];
    let path_lower = path.to_lowercase();
    audio_extensions.iter().any(|ext| path_lower.ends_with(ext))
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
        .setup(|app| {
            // Handle files passed via command line arguments
            let args: Vec<String> = std::env::args().collect();
            let audio_files: Vec<String> = args.iter()
                .skip(1) // Skip the executable path
                .filter(|arg| is_audio_file(arg) && Path::new(arg).exists())
                .cloned()
                .collect();
            
            if !audio_files.is_empty() {
                let mut pending = PENDING_FILES.lock().unwrap();
                pending.extend(audio_files.clone());
                
                // Emit event to frontend after window is ready
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    let _ = app_handle.emit("files-opened", audio_files);
                });
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, scan_folder, write_file, read_audio_file, get_pending_files, switch_to_mini_player, switch_to_main_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
