//! Integration tests for the job catalog commands:
//!   - upsert with composite (description, bedroom, bathroom) keys
//!   - find by composite key
//!   - delete a single row
//!   - delete every variant for a description
//!   - replace_all_jobs (transactional bulk import)

mod common;

use common::TestDb;
use paint_contractor_lib::commands::*;
use paint_contractor_lib::models::JobDescription;
use serial_test::serial;

fn make_job(desc: &str, beds: i32, baths: i32, price: i32) -> JobDescription {
    JobDescription {
        id: 0,
        description: desc.into(),
        size_bedroom: beds,
        size_bathroom: baths,
        price,
    }
}

#[test]
#[serial]
fn upsert_creates_then_updates_price_for_existing_composite_key() {
    let _db = TestDb::new();

    let saved = upsert_job(make_job("Interior Paint", 2, 2, 100))
        .unwrap()
        .data
        .expect("inserted");
    assert!(saved.id > 0);
    assert_eq!(saved.price, 100);

    let updated = upsert_job(make_job("Interior Paint", 2, 2, 150))
        .unwrap()
        .data
        .expect("updated");
    assert_eq!(updated.id, saved.id, "same row, updated in place");
    assert_eq!(updated.price, 150);

    // Different bedroom/bathroom => brand new row.
    let other = upsert_job(make_job("Interior Paint", 3, 2, 200))
        .unwrap()
        .data
        .expect("inserted variant");
    assert_ne!(other.id, saved.id);
    assert_eq!(get_all_jobs().unwrap().len(), 2);
}

#[test]
#[serial]
fn upsert_rejects_blank_description() {
    let _db = TestDb::new();
    let res = upsert_job(make_job("   ", 1, 1, 50)).unwrap();
    assert!(!res.success);
    assert!(res.message.to_lowercase().contains("description"));
}

#[test]
#[serial]
fn find_job_by_key_resolves_composite_key() {
    let _db = TestDb::new();
    upsert_job(make_job("Trim Work", 2, 1, 80)).unwrap();
    upsert_job(make_job("Trim Work", 3, 1, 110)).unwrap();

    let hit = find_job_by_key("Trim Work".into(), 3, 1).unwrap();
    assert!(hit.is_some());
    assert_eq!(hit.unwrap().price, 110);

    let miss = find_job_by_key("Trim Work".into(), 9, 9).unwrap();
    assert!(miss.is_none());
}

#[test]
#[serial]
fn delete_job_removes_single_row_and_returns_error_for_unknown_id() {
    let _db = TestDb::new();
    let saved = upsert_job(make_job("Wash", 1, 1, 30))
        .unwrap()
        .data
        .expect("saved");
    let del = delete_job(saved.id).unwrap();
    assert!(del.success);
    assert!(get_all_jobs().unwrap().is_empty());

    let miss = delete_job(123_456).unwrap();
    assert!(!miss.success);
}

#[test]
#[serial]
fn delete_jobs_by_description_removes_every_variant() {
    let _db = TestDb::new();
    upsert_job(make_job("Interior Paint", 1, 1, 30)).unwrap();
    upsert_job(make_job("Interior Paint", 2, 1, 50)).unwrap();
    upsert_job(make_job("Interior Paint", 3, 2, 70)).unwrap();
    upsert_job(make_job("Other", 1, 1, 99)).unwrap();

    let res = delete_jobs_by_description("Interior Paint".into()).unwrap();
    assert!(res.success);
    assert_eq!(res.data, Some(3));

    let remaining = get_all_jobs().unwrap();
    assert_eq!(remaining.len(), 1);
    assert_eq!(remaining[0].description, "Other");
}

#[test]
#[serial]
fn delete_jobs_by_description_returns_zero_for_blank() {
    let _db = TestDb::new();
    let res = delete_jobs_by_description("   ".into()).unwrap();
    assert!(res.success);
    assert_eq!(res.data, Some(0));
}

#[test]
#[serial]
fn replace_all_jobs_atomically_swaps_the_catalog() {
    let _db = TestDb::new();
    upsert_job(make_job("Old", 1, 1, 10)).unwrap();
    upsert_job(make_job("Older", 2, 2, 20)).unwrap();
    assert_eq!(get_all_jobs().unwrap().len(), 2);

    let new = vec![
        make_job("New A", 1, 1, 10),
        make_job("New A", 2, 2, 20),
        make_job("New B", 1, 1, 30),
    ];
    let res = replace_all_jobs(new).unwrap();
    assert!(res.success);
    let after = get_all_jobs().unwrap();
    assert_eq!(after.len(), 3);
    assert!(after.iter().all(|j| j.description.starts_with("New")));
}
