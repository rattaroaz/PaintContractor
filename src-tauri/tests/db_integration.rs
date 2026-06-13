//! Integration tests against a real SQLite database (sandboxed to a tempdir).

mod common;

use common::TestDb;
use paint_contractor_lib::commands::*;
use paint_contractor_lib::models::*;
use serial_test::serial;

fn empty_company(name: &str, company_id: i32) -> Company {
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

fn empty_contractor(name: &str) -> Contractor {
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

#[test]
#[serial]
fn init_db_creates_required_tables_and_indices() {
    let _db = TestDb::new();
    assert!(get_all_companies().unwrap().is_empty());
    assert!(get_all_contractors().unwrap().is_empty());
    assert!(get_all_jobs().unwrap().is_empty());
    assert!(get_all_invoices().unwrap().is_empty());
    let info = get_my_company_info().unwrap();
    assert_eq!(info.id, 1);
}

#[test]
#[serial]
fn update_config_defaults_and_round_trips() {
    let _db = TestDb::new();
    let cfg = get_update_config().unwrap();
    assert_eq!(cfg.repository_owner, "rattaroaz");
    assert_eq!(cfg.repository_name, "PaintContractor");
    assert!(!cfg.check_on_startup);
    assert!(!cfg.enabled);
    assert_eq!(cfg.last_check, None);

    let next = UpdateConfig {
        repository_owner: "owner".into(),
        repository_name: "repo".into(),
        check_on_startup: true,
        enabled: true,
        last_check: Some("2026-06-13T10:00:00Z".into()),
    };
    assert!(save_update_config(next.clone()).unwrap().success);
    assert_eq!(
        get_update_config().unwrap().repository_owner,
        next.repository_owner
    );
    assert_eq!(
        get_update_config().unwrap().repository_name,
        next.repository_name
    );
    assert!(get_update_config().unwrap().check_on_startup);
    assert!(get_update_config().unwrap().enabled);
    assert_eq!(get_update_config().unwrap().last_check, next.last_check);
}

#[test]
#[serial]
fn get_next_company_id_advances_after_inserts() {
    let _db = TestDb::new();
    assert_eq!(get_next_company_id().unwrap(), 1000);

    save_company(empty_company("Acme", 1000))
        .unwrap()
        .data
        .expect("saved");
    assert_eq!(get_next_company_id().unwrap(), 1001);

    save_company(empty_company("Beta", 1001))
        .unwrap()
        .data
        .expect("saved");
    assert_eq!(get_next_company_id().unwrap(), 1002);
}

#[test]
#[serial]
fn save_company_rejects_duplicate_name_and_id() {
    let _db = TestDb::new();
    save_company(empty_company("Acme", 1000)).unwrap();

    let dup_name = save_company(empty_company("Acme", 1001)).unwrap();
    assert!(!dup_name.success);
    assert!(dup_name.message.to_lowercase().contains("name"));

    let dup_id = save_company(empty_company("Beta", 1000)).unwrap();
    assert!(!dup_id.success);
    assert!(dup_id.message.to_lowercase().contains("id"));
}

#[test]
#[serial]
fn save_company_validates_id_range() {
    let _db = TestDb::new();
    let too_small = save_company(empty_company("Tiny", 100)).unwrap();
    assert!(!too_small.success);
    let too_big = save_company(empty_company("Huge", 99_999)).unwrap();
    assert!(!too_big.success);
}

#[test]
#[serial]
fn upsert_job_uses_composite_key_and_overwrites_price() {
    let _db = TestDb::new();
    let first = upsert_job(JobDescription {
        id: 0,
        description: "Paint".into(),
        size_bedroom: 2,
        size_bathroom: 2,
        price: 100,
    })
    .unwrap()
    .data
    .expect("saved");

    let second = upsert_job(JobDescription {
        id: 0,
        description: "Paint".into(),
        size_bedroom: 2,
        size_bathroom: 2,
        price: 150,
    })
    .unwrap()
    .data
    .expect("saved");

    assert_eq!(
        first.id, second.id,
        "same composite key should update in place"
    );
    assert_eq!(second.price, 150);
    let all = get_all_jobs().unwrap();
    assert_eq!(all.len(), 1);
}

#[test]
#[serial]
fn upsert_job_creates_distinct_rows_per_bed_bath() {
    let _db = TestDb::new();
    for (bed, bath, price) in [(1, 1, 50), (2, 2, 100), (3, 2, 150)] {
        upsert_job(JobDescription {
            id: 0,
            description: "Paint".into(),
            size_bedroom: bed,
            size_bathroom: bath,
            price,
        })
        .unwrap();
    }
    let all = get_all_jobs().unwrap();
    assert_eq!(all.len(), 3);
}

#[test]
#[serial]
fn find_job_by_key_returns_none_for_unknown_combo() {
    let _db = TestDb::new();
    upsert_job(JobDescription {
        id: 0,
        description: "Paint".into(),
        size_bedroom: 1,
        size_bathroom: 1,
        price: 50,
    })
    .unwrap();

    assert!(find_job_by_key("Paint".into(), 1, 1).unwrap().is_some());
    assert!(find_job_by_key("Paint".into(), 5, 5).unwrap().is_none());
    assert!(find_job_by_key("Other".into(), 1, 1).unwrap().is_none());
}

#[test]
#[serial]
fn delete_jobs_by_description_removes_every_variant() {
    let _db = TestDb::new();
    for (bed, bath) in [(1, 1), (2, 2), (3, 3)] {
        upsert_job(JobDescription {
            id: 0,
            description: "Paint".into(),
            size_bedroom: bed,
            size_bathroom: bath,
            price: 10,
        })
        .unwrap();
    }
    upsert_job(JobDescription {
        id: 0,
        description: "Trim".into(),
        size_bedroom: 1,
        size_bathroom: 1,
        price: 25,
    })
    .unwrap();

    let removed = delete_jobs_by_description("Paint".into()).unwrap();
    assert!(removed.success);
    assert_eq!(removed.data, Some(3));

    let remaining = get_all_jobs().unwrap();
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].description, "Trim");
}

#[test]
#[serial]
fn contractor_crud_roundtrip() {
    let _db = TestDb::new();
    let saved = save_contractor(empty_contractor("Alex"))
        .unwrap()
        .data
        .expect("saved");
    assert!(saved.id > 0);

    let all = get_all_contractors().unwrap();
    assert_eq!(all.len(), 1);
    assert_eq!(all[0].name, "Alex");

    let deleted = delete_contractor(saved.id).unwrap();
    assert!(deleted.success);
    assert!(get_all_contractors().unwrap().is_empty());
}
