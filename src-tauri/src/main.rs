// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager, RunEvent, State,
};
use walkdir::WalkDir;

struct FileWatcherState {
    handle: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    path: Option<PathBuf>,
}

struct DirWatcherState {
    handle: Option<notify_debouncer_mini::Debouncer<notify::RecommendedWatcher>>,
    path: Option<PathBuf>,
}

/// Stores the file path that was requested to be opened (via CLI args or OS file association)
/// before the frontend was ready to receive events.
struct PendingOpenFile {
    path: Option<String>,
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
                    let _ = app_handle.emit("file-changed", &emit_path);
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
                    let _ = app_handle.emit("dir-changed", &emit_dir);
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

/// Called by the frontend on startup to retrieve any file path that was pending
/// (e.g., from double-clicking a .md file in Finder before the frontend was ready).
#[tauri::command]
fn get_pending_open_file(state: State<'_, Mutex<PendingOpenFile>>) -> Option<String> {
    let mut guard = state.lock().ok()?;
    guard.path.take()
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
    let ctx = tauri::generate_context!();
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .menu(|app| {
            // File submenu
            let open_file = MenuItemBuilder::with_id("open_file", "Open File")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let open_folder = MenuItemBuilder::with_id("open_folder", "Open Folder")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?;

            let file_submenu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &open_file,
                    &open_folder,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, Some("Close Window"))?,
                ],
            )?;

            let edit_submenu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, Some("Undo"))?,
                    &PredefinedMenuItem::redo(app, Some("Redo"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, Some("Cut"))?,
                    &PredefinedMenuItem::copy(app, Some("Copy"))?,
                    &PredefinedMenuItem::paste(app, Some("Paste"))?,
                    &PredefinedMenuItem::select_all(app, Some("Select All"))?,
                ],
            )?;

            #[cfg(target_os = "macos")]
            {
                let about_item = MenuItemBuilder::with_id("about", "About MD Viewer")
                    .build(app)?;
                let check_update_item = MenuItemBuilder::with_id("check_update", "Check for Updates...")
                    .build(app)?;

                let app_submenu = Submenu::with_items(
                    app,
                    "MD Viewer",
                    true,
                    &[
                        &about_item,
                        &check_update_item,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::hide(app, Some("Hide"))?,
                        &PredefinedMenuItem::hide_others(app, Some("Hide Others"))?,
                        &PredefinedMenuItem::show_all(app, Some("Show All"))?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::quit(app, Some("Quit"))?,
                    ],
                )?;

                Menu::with_items(app, &[&app_submenu, &file_submenu, &edit_submenu])
            }

            #[cfg(not(target_os = "macos"))]
            {
                let about_item = MenuItemBuilder::with_id("about", "About MD Viewer")
                    .build(app)?;
                let check_update_item = MenuItemBuilder::with_id("check_update", "Check for Updates...")
                    .build(app)?;

                let help_submenu = Submenu::with_items(
                    app,
                    "Help",
                    true,
                    &[&about_item, &check_update_item],
                )?;

                Menu::with_items(app, &[&file_submenu, &edit_submenu, &help_submenu])
            }
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "open_file" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-open-file", ());
                    }
                }
                "open_folder" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-open-folder", ());
                    }
                }
                "about" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-about", ());
                    }
                }
                "check_update" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.emit("menu-check-update", ());
                    }
                }
                _ => {}
            }
        })
        .manage(Mutex::new(FileWatcherState {
            handle: None,
            path: None,
        }))
        .manage(Mutex::new(DirWatcherState {
            handle: None,
            path: None,
        }))
        .manage(Mutex::new(PendingOpenFile { path: None }))
        .setup(|app| {
            // Handle file path passed via CLI arguments (Windows/Linux double-click)
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let path = PathBuf::from(&args[1]);
                if path.exists() && is_markdown_file(&path) {
                    let path_str = path.to_string_lossy().to_string();
                    // Store in pending state for the frontend to pick up
                    let state = app.state::<Mutex<PendingOpenFile>>();
                    let mut guard = state.lock().unwrap();
                    guard.path = Some(path_str);
                    drop(guard);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            watch_file,
            unwatch_file,
            watch_dir,
            scan_md_files,
            get_pending_open_file
        ])
        .build(ctx)
        .expect("error while building tauri application")
        .run(|_app, _event| {
            // Handle macOS file open events (double-click in Finder, drag onto dock icon)
            #[cfg(target_os = "macos")]
            {
                if let RunEvent::Opened { urls } = &_event {
                    for url in urls {
                        if let Ok(path) = url.to_file_path() {
                            if path.exists() && is_markdown_file(&path) {
                                let path_str = path.to_string_lossy().to_string();
                                // Try to emit to frontend (works if already running)
                                let _ = _app.emit("open-file", &path_str);
                                // Also store in pending state (in case frontend isn't ready yet)
                                if let Some(state) = _app.try_state::<Mutex<PendingOpenFile>>() {
                                    if let Ok(mut guard) = state.lock() {
                                        guard.path = Some(path_str);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
}

/// Check if a file path has a markdown extension.
fn is_markdown_file(path: &PathBuf) -> bool {
    let md_extensions = ["md", "markdown", "mdx"];
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| md_extensions.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}
