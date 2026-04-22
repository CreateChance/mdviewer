// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};
use walkdir::WalkDir;

struct FileWatcherState {
    handle: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    path: Option<PathBuf>,
}

struct DirWatcherState {
    handle: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    path: Option<PathBuf>,
}

#[tauri::command]
fn watch_file(
    app: AppHandle,
    path: String,
    state: State<'_, Mutex<FileWatcherState>>,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.handle = None;
    guard.path = None;

    let watch_path = PathBuf::from(&path);
    if !watch_path.exists() {
        return Err("File does not exist".into());
    }

    let app_handle = app.clone();
    let emit_path = path.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(500),
        move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            if let Ok(events) = res {
                if events.iter().any(|e| e.kind == DebouncedEventKind::Any) {
                    let _ = app_handle.emit_all("file-changed", &emit_path);
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watcher()
        .watch(&watch_path, notify::RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    guard.handle = Some(debouncer);
    guard.path = Some(watch_path);
    Ok(())
}

#[tauri::command]
fn unwatch_file(state: State<'_, Mutex<FileWatcherState>>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.handle = None;
    guard.path = None;
    Ok(())
}

#[tauri::command]
fn watch_dir(
    app: AppHandle,
    dir: String,
    state: State<'_, Mutex<DirWatcherState>>,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.handle = None;
    guard.path = None;

    let watch_path = PathBuf::from(&dir);
    if !watch_path.is_dir() {
        return Err("Path is not a directory".into());
    }

    let app_handle = app.clone();
    let emit_dir = dir.clone();

    let mut debouncer = new_debouncer(
        Duration::from_secs(1),
        move |res: Result<Vec<notify_debouncer_mini::DebouncedEvent>, notify::Error>| {
            if let Ok(events) = res {
                let dominated = events.iter().any(|e| e.kind == DebouncedEventKind::Any);
                if dominated {
                    let _ = app_handle.emit_all("dir-changed", &emit_dir);
                }
            }
        },
    )
    .map_err(|e| e.to_string())?;

    debouncer
        .watcher()
        .watch(&watch_path, notify::RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    guard.handle = Some(debouncer);
    guard.path = Some(watch_path);
    Ok(())
}

/// Recursively scan a directory for markdown files, returning their absolute paths.
#[tauri::command]
fn scan_md_files(dir: String) -> Result<Vec<String>, String> {
    let md_extensions = ["md", "markdown", "mdx"];
    let mut files: Vec<String> = Vec::new();

    for entry in WalkDir::new(&dir)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                if md_extensions.contains(&ext.to_lowercase().as_str()) {
                    if let Some(path_str) = entry.path().to_str() {
                        files.push(path_str.to_string());
                    }
                }
            }
        }
    }

    files.sort();
    Ok(files)
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(FileWatcherState {
            handle: None,
            path: None,
        }))
        .manage(Mutex::new(DirWatcherState {
            handle: None,
            path: None,
        }))
        .invoke_handler(tauri::generate_handler![
            watch_file,
            unwatch_file,
            watch_dir,
            scan_md_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
