// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// File store for drafts, settings, and user type files.
// Root is %APPDATA%\BEZ Pro Write\ on Windows and ~/Library/Application Support/BEZ Pro Write/
// on Mac (built here, not Tauri's identifier-named folder).

use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

const APP_FOLDER: &str = "BEZ Pro Write";
const SUBFOLDERS: [&str; 4] = ["drafts", "settings", "types", "snapshots"];

pub fn root() -> Result<PathBuf, String> {
    let root = base_dir()?.join(APP_FOLDER);
    for sub in SUBFOLDERS {
        fs::create_dir_all(root.join(sub)).map_err(|e| format!("Could not create the data folder: {e}"))?;
    }
    Ok(root)
}

#[cfg(windows)]
fn base_dir() -> Result<PathBuf, String> {
    std::env::var_os("APPDATA").map(PathBuf::from).ok_or_else(|| "The APPDATA folder could not be found.".into())
}

#[cfg(target_os = "macos")]
fn base_dir() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME").ok_or("The home folder could not be found.")?;
    Ok(PathBuf::from(home).join("Library").join("Application Support"))
}

#[cfg(not(any(windows, target_os = "macos")))]
fn base_dir() -> Result<PathBuf, String> {
    let home = std::env::var_os("HOME").ok_or("The home folder could not be found.")?;
    Ok(std::env::var_os("XDG_DATA_HOME").map(PathBuf::from).unwrap_or_else(|| PathBuf::from(home).join(".local").join("share")))
}

// Windows device names: writing to "drafts/CON.json" would talk to a device, not a file.
const RESERVED: [&str; 22] = [
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

// A plain file or folder name: no ":" (Windows alternate data streams) and not a device name.
fn plain_name(name: &std::ffi::OsStr) -> bool {
    let Some(name) = name.to_str() else { return false };
    let stem = name.split('.').next().unwrap_or("").trim_end().to_ascii_uppercase();
    !name.contains(':') && !RESERVED.contains(&stem.as_str())
}

// Turn a relative path from the frontend into a full path inside the root.
fn resolve(rel: &str) -> Result<PathBuf, String> {
    let rel_path = Path::new(rel);
    let safe = !rel.is_empty()
        && rel_path
            .components()
            .all(|c| matches!(c, Component::Normal(n) if plain_name(n)));
    if !safe {
        return Err(format!("Refused path: {rel}"));
    }
    Ok(root()?.join(rel_path))
}

pub fn read(rel: &str) -> Result<Option<String>, String> {
    let path = resolve(rel)?;
    match fs::read_to_string(&path) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Could not read {rel}: {e}")),
    }
}

// Write to a temp file then rename, so a crash mid-save never leaves half a file.
pub fn write(rel: &str, content: &str) -> Result<(), String> {
    let path = resolve(rel)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Could not create folder for {rel}: {e}"))?;
    }
    let tmp = path.with_extension("tmp");
    {
        let mut f = fs::File::create(&tmp).map_err(|e| format!("Could not save {rel}: {e}"))?;
        f.write_all(content.as_bytes()).map_err(|e| format!("Could not save {rel}: {e}"))?;
        f.sync_all().ok();
    }
    fs::rename(&tmp, &path).map_err(|e| format!("Could not save {rel}: {e}"))
}

pub fn list(dir: &str) -> Result<Vec<String>, String> {
    let path = resolve(dir)?;
    let mut names = Vec::new();
    let entries = match fs::read_dir(&path) {
        Ok(e) => e,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(names),
        Err(e) => return Err(format!("Could not list {dir}: {e}")),
    };
    for entry in entries.flatten() {
        if entry.path().is_file() {
            names.push(entry.file_name().to_string_lossy().into_owned());
        }
    }
    names.sort();
    Ok(names)
}

pub fn delete(rel: &str) -> Result<(), String> {
    let path = resolve(rel)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Could not delete {rel}: {e}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_escaping_paths() {
        assert!(resolve("../x.json").is_err());
        #[cfg(windows)]
        assert!(resolve("C:\\Windows\\x").is_err());
        assert!(resolve("/etc/passwd").is_err());
        assert!(resolve("drafts/CON.json").is_err());
        assert!(resolve("drafts/nul").is_err());
        assert!(resolve("drafts/com1.txt").is_err());
        assert!(resolve("drafts/a.json:stream").is_err());
        assert!(resolve("drafts/console.json").is_ok());
        assert!(resolve("").is_err());
        assert!(resolve("drafts/a.json").is_ok());
    }
}
