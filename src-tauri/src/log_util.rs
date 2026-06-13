use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Instant;

#[derive(Debug, Serialize)]
pub struct LoggingPaths {
    pub database_path: String,
    pub log_directory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppLogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

/// Runs a command that returns `Result<T, String>` with start/ok/error timing logs.
pub fn run<T, F: FnOnce() -> Result<T, String>>(
    name: &'static str,
    detail: Option<&str>,
    f: F,
) -> Result<T, String> {
    let start = Instant::now();
    match detail {
        Some(d) => info!("command.start name={} detail={}", name, d),
        None => info!("command.start name={}", name),
    }
    let out = f();
    let ms = start.elapsed().as_millis();
    match &out {
        Ok(_) => info!("command.ok name={} elapsed_ms={}", name, ms),
        Err(e) => error!("command.error name={} elapsed_ms={} err={}", name, ms, e),
    }
    out
}

/// Runs a command that returns a plain value (no `Result`).
pub fn run_value<T, F: FnOnce() -> T>(name: &'static str, detail: Option<&str>, f: F) -> T {
    let start = Instant::now();
    match detail {
        Some(d) => info!("command.start name={} detail={}", name, d),
        None => info!("command.start name={}", name),
    }
    let out = f();
    info!(
        "command.ok name={} elapsed_ms={}",
        name,
        start.elapsed().as_millis()
    );
    out
}

/// Logs a business-level failure inside `OperationResult` while IPC still returned `Ok`.
pub fn log_operation_failure(command: &str, message: &str) {
    warn!(
        "command.business_error name={} message={}",
        command, message
    );
}

const MAX_LOG_LINES: usize = 1000;

/// Parses a line written by `tauri-plugin-log`: `[date][time][target][LEVEL] message`.
pub fn parse_plugin_log_line(line: &str) -> Option<AppLogEntry> {
    let mut rest = line.trim();
    if rest.is_empty() {
        return None;
    }

    let mut fields: Vec<&str> = Vec::with_capacity(4);
    for _ in 0..4 {
        if !rest.starts_with('[') {
            return None;
        }
        let end = rest.find(']')?;
        fields.push(&rest[1..end]);
        rest = &rest[end + 1..];
    }

    Some(AppLogEntry {
        timestamp: format!("{} {}", fields[0], fields[1]),
        level: fields[3].to_lowercase(),
        message: rest.trim().to_string(),
    })
}

pub fn read_app_log_entries(log_dir: &std::path::Path) -> Result<Vec<AppLogEntry>, String> {
    if !log_dir.exists() {
        return Ok(Vec::new());
    }

    let mut log_files: Vec<PathBuf> = Vec::new();
    for entry in std::fs::read_dir(log_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name == "app.log" || name.starts_with("app.log.") {
            log_files.push(entry.path());
        }
    }

    log_files.sort_by_key(|path| {
        std::fs::metadata(path)
            .and_then(|meta| meta.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
    });

    let mut lines: Vec<String> = Vec::new();
    for path in log_files {
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        for line in content.lines() {
            lines.push(line.to_string());
        }
    }

    let start = lines.len().saturating_sub(MAX_LOG_LINES);
    Ok(lines[start..]
        .iter()
        .filter_map(|line| parse_plugin_log_line(line))
        .collect())
}

#[cfg(test)]
mod tests {
    use super::log_operation_failure;
    use log::{Level, LevelFilter, Log, Metadata, Record};
    use serial_test::serial;
    use std::sync::{Mutex, OnceLock};

    struct CaptureLogger(Mutex<Vec<String>>);

    impl Log for CaptureLogger {
        fn enabled(&self, _: &Metadata) -> bool {
            true
        }

        fn log(&self, record: &Record) {
            if record.level() == Level::Warn {
                self.0
                    .lock()
                    .expect("capture logger mutex")
                    .push(format!("{}", record.args()));
            }
        }

        fn flush(&self) {}
    }

    static CAPTURE: OnceLock<&'static CaptureLogger> = OnceLock::new();

    fn capture_logger() -> &'static CaptureLogger {
        CAPTURE.get_or_init(|| {
            let logger = Box::leak(Box::new(CaptureLogger(Mutex::new(Vec::new()))));
            let _ = log::set_logger(logger);
            log::set_max_level(LevelFilter::Warn);
            logger
        })
    }

    #[test]
    fn parse_plugin_log_line_reads_tauri_plugin_format() {
        use super::parse_plugin_log_line;

        let entry = parse_plugin_log_line(
            "[2026-06-06][12:34:56][frontend][INFO] Update check started {\"category\":\"update\"}",
        )
        .expect("parsed");
        assert_eq!(entry.timestamp, "2026-06-06 12:34:56");
        assert_eq!(entry.level, "info");
        assert!(entry.message.contains("Update check started"));
    }

    #[test]
    fn parse_plugin_log_line_rejects_blank_lines() {
        use super::parse_plugin_log_line;

        assert!(parse_plugin_log_line("").is_none());
        assert!(parse_plugin_log_line("not a log line").is_none());
    }

    #[test]
    #[serial]
    fn log_operation_failure_emits_warn_line() {
        let logger = capture_logger();
        logger.0.lock().expect("capture logger mutex").clear();
        log_operation_failure("save_company", "Company name is required.");
        let lines = logger.0.lock().expect("capture logger mutex");
        assert_eq!(lines.len(), 1);
        assert!(lines[0].contains("command.business_error"));
        assert!(lines[0].contains("name=save_company"));
        assert!(lines[0].contains("Company name is required."));
    }

    #[test]
    #[serial]
    fn operation_result_err_uses_log_operation_failure() {
        use crate::models::OperationResult;

        let logger = capture_logger();
        logger.0.lock().expect("capture logger mutex").clear();
        let result = OperationResult::<()>::err("Name is required.");
        assert!(!result.success);
        assert_eq!(result.message, "Name is required.");
        let lines = logger.0.lock().expect("capture logger mutex");
        assert_eq!(lines.len(), 1);
        assert!(lines[0].contains("command.business_error"));
        assert!(lines[0].contains("name=operation_result"));
        assert!(lines[0].contains("Name is required."));
    }
}
