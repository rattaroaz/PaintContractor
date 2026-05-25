//! Snapshot tests for the JSON shapes returned by Tauri commands.
//! Run `INSTA_UPDATE=always cargo test --test snapshot` to refresh after a
//! deliberate change.

mod common;

use common::TestDb;
use insta::assert_json_snapshot;
use paint_contractor_lib::commands::*;
use paint_contractor_lib::models::*;
use serial_test::serial;

#[test]
#[serial]
fn snapshot_my_company_info_default() {
    let _db = TestDb::new();
    let info = get_my_company_info().unwrap();
    assert_json_snapshot!("my_company_info_default", info);
}

#[test]
#[serial]
fn snapshot_operation_result_for_invalid_invoice() {
    let _db = TestDb::new();
    let invalid = Invoice {
        id: 0,
        todays_date: "".into(),
        work_date: "".into(),
        company_name: "".into(),
        property_address: "".into(),
        unit: "".into(),
        gate_code: None,
        lock_box: None,
        size_bedroom: 0,
        size_bathroom: 0,
        work_order: None,
        job_description_choice: "[]".into(),
        contractor_name: "".into(),
        amount_cost: 0,
        amount_paid1: 0,
        date_paid1: None,
        check_number1: None,
        amount_paid2: 0,
        date_paid2: None,
        check_number2: None,
        invoice_created_date: None,
        special_note: None,
        garage_remote_code: None,
        status: 0,
    };
    let res = add_invoice(invalid).unwrap();
    assert_json_snapshot!("invalid_invoice_result", res);
}

#[test]
#[serial]
fn snapshot_company_after_save() {
    let _db = TestDb::new();
    let saved = save_company(Company {
        id: 0,
        company_id: 1000,
        name: "Acme".into(),
        owner: Some("Jane".into()),
        phone: None,
        email: None,
        address: None,
        city: None,
        zip: None,
        special_note: None,
        supervisors: vec![],
    })
    .unwrap()
    .data
    .expect("saved");
    assert_json_snapshot!("company_after_save", saved, {
        ".id" => "[id]",
    });
}

#[test]
#[serial]
fn snapshot_contractor_after_save() {
    let _db = TestDb::new();
    let saved = save_contractor(Contractor {
        id: 0,
        name: "Alex".into(),
        license_number: Some("L".into()),
        social_security_number: None,
        contractor_id: Some("AP-1".into()),
        payroll_percent: Some("10".into()),
        cell_phone: None,
        email: None,
        address: None,
        city: None,
        zip: None,
        special_note: None,
        is_active: Some(true),
    })
    .unwrap()
    .data
    .expect("saved");
    assert_json_snapshot!("contractor_after_save", saved, {
        ".id" => "[id]",
    });
}

#[test]
#[serial]
fn snapshot_invoice_after_add() {
    let _db = TestDb::new();
    let saved = add_invoice(Invoice {
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
    })
    .unwrap()
    .data
    .expect("added");
    assert_json_snapshot!("invoice_after_add", saved, {
        ".id" => "[id]",
    });
}

#[test]
#[serial]
fn snapshot_ar_payment_summary() {
    let _db = TestDb::new();
    let mut inv = Invoice {
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
        work_order: None,
        job_description_choice: "[]".into(),
        contractor_name: "Alex".into(),
        amount_cost: 100,
        amount_paid1: 0,
        date_paid1: None,
        check_number1: None,
        amount_paid2: 0,
        date_paid2: None,
        check_number2: None,
        invoice_created_date: None,
        special_note: None,
        garage_remote_code: None,
        status: 1,
    };
    let saved = add_invoice(inv.clone()).unwrap().data.expect("added");
    inv.id = saved.id;
    inv.amount_paid1 = 100;
    let result = apply_receivable_payments(vec![inv]).unwrap();
    assert_json_snapshot!("ar_payment_summary", result);
}

#[test]
#[serial]
fn snapshot_jobs_after_upsert() {
    let _db = TestDb::new();
    for (b, ba, p) in [(1, 1, 50), (2, 2, 100), (3, 2, 150)] {
        upsert_job(JobDescription {
            id: 0,
            description: "Paint".into(),
            size_bedroom: b,
            size_bathroom: ba,
            price: p,
        })
        .unwrap();
    }
    let mut jobs = get_all_jobs().unwrap();
    jobs.sort_by_key(|j| (j.size_bedroom, j.size_bathroom));
    assert_json_snapshot!("jobs_after_upsert", jobs, {
        "[].id" => "[id]",
    });
}
