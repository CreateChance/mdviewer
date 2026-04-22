// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

struct WatcherState {
    /// Hold the debouncer so it (and its inner watcher) stays alive.
    /// Dropping it stops the watch.
    handle: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    /// The path currently being watched.
    path: Option<PathBuf>,
}

#[tauri::command]
fn watch_file(
    app: AppHandle,
    path: String,
    state: State<'_, Mutex<WatcherState>>,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;

    // Stop previous watcher if any
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
                let dominated = events.iter().any(|e| {
                    e.kind == DebouncedEventKind::Any
                });
                if dominated {
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
fn unwatch_file(state: State<'_, Mutex<WatcherState>>) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.handle = None;
    guard.path = None;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Mutex::new(WatcherState {
            handle: None,
            path: None,
        }))
        .invoke_handler(tauri::generate_handler![watch_file, unwatch_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
