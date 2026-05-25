pub mod commands;
pub mod db;
pub mod models;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    db::init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
