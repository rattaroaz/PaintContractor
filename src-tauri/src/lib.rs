pub mod commands;
pub mod db;
pub mod log_util;
pub mod models;

use commands::*;
use log::{debug, error, info, warn};
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

const MAX_FRONTEND_LOG_CHARS: usize = 8_000;

#[tauri::command]
fn log_frontend(level: String, message: String, context: Option<String>) {
    let message = if message.chars().count() > MAX_FRONTEND_LOG_CHARS {
        format!(
            "{}… [truncated]",
            message
                .chars()
                .take(MAX_FRONTEND_LOG_CHARS)
                .collect::<String>()
        )
    } else {
        message
    };
    let ctx = context
        .as_deref()
        .map(|value| {
            if value.chars().count() > MAX_FRONTEND_LOG_CHARS {
                format!(
                    "{}… [truncated]",
                    value
                        .chars()
                        .take(MAX_FRONTEND_LOG_CHARS)
                        .collect::<String>()
                )
            } else {
                value.to_string()
            }
        })
        .unwrap_or_default();
    match level.as_str() {
        "error" => error!("[frontend] {} {}", message, ctx),
        "warn" => warn!("[frontend] {} {}", message, ctx),
        "debug" => debug!("[frontend] {} {}", message, ctx),
        _ => info!("[frontend] {} {}", message, ctx),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("app".into()),
                    }),
                ])
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if let Err(e) = db::init_db() {
                error!("Failed to initialize database: {}", e);
                return Err(Box::<dyn std::error::Error>::from(std::io::Error::other(
                    format!("Failed to initialize database: {e}"),
                )));
            }
            let log_dir = app
                .path()
                .app_log_dir()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|e| format!("(unavailable: {e})"));
            info!(
                "Starting DKSK Paint Contractor v{} database_path={} log_directory={}",
                env!("CARGO_PKG_VERSION"),
                db::db_path().display(),
                log_dir
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_database_path,
            create_database_backup,
            restore_database_file,
            get_my_company_info,
            save_my_company_info,
            get_all_companies,
            get_next_company_id,
            save_company,
            ensure_company_by_name,
            delete_company,
            delete_supervisor,
            delete_property,
            get_company_property_addresses,
            get_all_contractors,
            save_contractor,
            delete_contractor,
            get_all_jobs,
            replace_all_jobs,
            find_job_by_key,
            upsert_job,
            delete_job,
            delete_jobs_by_description,
            get_all_invoices,
            get_invoices_by_date_range,
            get_invoices_receivable,
            get_invoices_sales,
            get_invoices_active,
            add_invoice,
            update_invoice,
            delete_invoice,
            apply_receivable_payments,
            import_companies_csv,
            import_properties_csv,
            import_sales_csv,
            get_app_version,
            get_logging_paths,
            get_app_logs,
            log_frontend,
            get_update_config,
            save_update_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
