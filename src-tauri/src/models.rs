use crate::log_util;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationResult<T> {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
}

impl<T> OperationResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            message: String::new(),
            data: Some(data),
        }
    }
    pub fn ok_msg(data: T, msg: &str) -> Self {
        Self {
            success: true,
            message: msg.to_string(),
            data: Some(data),
        }
    }
    pub fn err(msg: &str) -> Self {
        log_util::log_operation_failure("operation_result", msg);
        Self {
            success: false,
            message: msg.to_string(),
            data: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MyCompanyInfo {
    pub id: i64,
    pub name: String,
    pub phone: String,
    pub email: String,
    pub address: String,
    pub zip: String,
    pub license_number: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Property {
    pub id: i64,
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub zip: Option<String>,
    pub gate_code: Option<String>,
    pub garage_remote_code: Option<String>,
    pub lock_box: Option<String>,
    pub special_note: Option<String>,
    pub manager_name: Option<String>,
    pub manager_phone: Option<String>,
    pub manager_email: Option<String>,
    pub is_active: Option<bool>,
    pub supervisor_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Supervisor {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub company_id: i64,
    #[serde(default)]
    pub properties: Vec<Property>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Company {
    pub id: i64,
    pub company_id: i32,
    pub name: String,
    pub owner: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub zip: Option<String>,
    pub special_note: Option<String>,
    #[serde(default)]
    pub supervisors: Vec<Supervisor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contractor {
    pub id: i64,
    pub name: String,
    pub license_number: Option<String>,
    pub social_security_number: Option<String>,
    pub contractor_id: Option<String>,
    pub payroll_percent: Option<String>,
    pub cell_phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub zip: Option<String>,
    pub special_note: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobDescription {
    pub id: i64,
    pub description: String,
    pub size_bedroom: i32,
    pub size_bathroom: i32,
    pub price: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id: i64,
    pub todays_date: String,
    pub work_date: String,
    pub company_name: String,
    pub property_address: String,
    pub unit: String,
    pub gate_code: Option<String>,
    pub lock_box: Option<String>,
    pub size_bedroom: i32,
    pub size_bathroom: i32,
    pub work_order: Option<String>,
    pub job_description_choice: String,
    pub contractor_name: String,
    pub amount_cost: i32,
    pub amount_paid1: i32,
    pub date_paid1: Option<String>,
    pub check_number1: Option<String>,
    pub amount_paid2: i32,
    pub date_paid2: Option<String>,
    pub check_number2: Option<String>,
    pub invoice_created_date: Option<String>,
    pub special_note: Option<String>,
    pub garage_remote_code: Option<String>,
    pub status: i32,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceDashboardData {
    pub invoices: Vec<Invoice>,
    pub company_names: Vec<String>,
    pub addresses: Vec<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSettings {
    pub repository_owner: String,
    pub repository_name: String,
    pub check_on_startup: bool,
    pub enabled: bool,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubReleaseInfo {
    pub version: String,
    pub release_notes: String,
    pub download_url: Option<String>,
    pub is_update_available: bool,
}
