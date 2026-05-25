use log::{error, info, warn};
use serde::Serialize;
use std::time::Instant;

#[derive(Debug, Serialize)]
pub struct LoggingPaths {
    pub database_path: String,
    pub log_directory: String,
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
