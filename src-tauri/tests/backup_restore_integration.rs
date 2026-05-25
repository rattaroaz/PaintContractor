//! Integration tests for `create_database_backup`, `restore_database_file`,
//! and `get_database_path`.

mod common;

use common::fixtures::*;
use common::TestDb;
use paint_contractor_lib::commands::*;
use serial_test::serial;

#[test]
#[serial]
fn get_database_path_is_non_empty_and_reflects_env_override() {
    let db = TestDb::new();
    let path = get_database_path();
    assert!(!path.is_empty());
    assert_eq!(path, db.path.display().to_string());
}

#[test]
#[serial]
fn create_backup_returns_valid_sqlite_header_bytes() {
    let _db = TestDb::new();
    let bytes = create_database_backup().unwrap();
    assert!(bytes.len() >= 16);
    assert_eq!(&bytes[..16], b"SQLite format 3\0");
}

#[test]
#[serial]
fn backup_then_restore_preserves_data() {
    let _db = TestDb::new();
    save_contractor(make_contractor("Alex")).unwrap();
    save_company(make_company("Acme", 1000)).unwrap();
    let bytes_before = create_database_backup().unwrap();

    // Mutate state away from the backup
    save_contractor(make_contractor("Sam")).unwrap();
    assert_eq!(get_all_contractors().unwrap().len(), 2);

    restore_database_file(bytes_before).unwrap();
    assert_eq!(
        get_all_contractors().unwrap().len(),
        1,
        "restore returns to backed-up state"
    );
    assert_eq!(get_all_companies().unwrap().len(), 1);
}

#[test]
#[serial]
fn restore_rejects_invalid_sqlite_header() {
    let _db = TestDb::new();
    let bogus = vec![0u8; 32];
    let err = restore_database_file(bogus).unwrap_err();
    assert!(err.to_lowercase().contains("sqlite"));
}
