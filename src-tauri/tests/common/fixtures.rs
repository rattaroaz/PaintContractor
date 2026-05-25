//! Reusable builders for Rust integration tests. Not all builders are used by
//! every test file; suppress the dead_code lint that fires for unused
//! per-file helpers.

#![allow(dead_code)]

use paint_contractor_lib::models::*;

pub fn make_invoice() -> Invoice {
    Invoice {
        id: 0,
        todays_date: "2026-05-25".into(),
        work_date: "2026-05-20".into(),
        company_name: "Acme".into(),
        property_address: "1 Main".into(),
        unit: "A".into(),
        gate_code: None,
        lock_box: None,
        size_bedroom: 2,
        size_bathroom: 2,
        work_order: Some("WO-1".into()),
        job_description_choice: "[\"Paint\"]".into(),
        contractor_name: "Alex".into(),
        amount_cost: 100,
        amount_paid1: 0,
        date_paid1: None,
        check_number1: None,
        amount_paid2: 0,
        date_paid2: None,
        check_number2: None,
        invoice_created_date: Some("2026-05-25".into()),
        special_note: None,
        garage_remote_code: None,
        status: 0,
    }
}

pub fn make_company(name: &str, company_id: i32) -> Company {
    Company {
        id: 0,
        company_id,
        name: name.into(),
        owner: None,
        phone: None,
        email: None,
        address: None,
        city: None,
        zip: None,
        special_note: None,
        supervisors: vec![],
    }
}

pub fn make_supervisor(name: &str) -> Supervisor {
    Supervisor {
        id: 0,
        name: name.into(),
        phone: None,
        email: None,
        company_id: 0,
        properties: vec![],
    }
}

pub fn make_property(name: &str) -> Property {
    Property {
        id: 0,
        name: name.into(),
        address: Some(format!("addr-{name}")),
        city: None,
        zip: None,
        gate_code: None,
        garage_remote_code: None,
        lock_box: None,
        special_note: None,
        manager_name: None,
        manager_phone: None,
        manager_email: None,
        is_active: Some(true),
        supervisor_id: 0,
    }
}

pub fn make_contractor(name: &str) -> Contractor {
    Contractor {
        id: 0,
        name: name.into(),
        license_number: None,
        social_security_number: None,
        contractor_id: None,
        payroll_percent: None,
        cell_phone: None,
        email: None,
        address: None,
        city: None,
        zip: None,
        special_note: None,
        is_active: Some(true),
    }
}
