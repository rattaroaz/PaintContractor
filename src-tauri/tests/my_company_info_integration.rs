//! Integration tests for MyCompanyInfo CRUD.

mod common;

use common::TestDb;
use paint_contractor_lib::commands::*;
use paint_contractor_lib::models::MyCompanyInfo;
use serial_test::serial;

#[test]
#[serial]
fn default_my_company_info_is_seeded() {
    let _db = TestDb::new();
    let info = get_my_company_info().unwrap();
    assert_eq!(info.id, 1);
    assert!(info.name.is_empty());
}

#[test]
#[serial]
fn save_my_company_info_allows_empty_fields() {
    let _db = TestDb::new();
    let info = MyCompanyInfo {
        id: 1,
        name: "   ".into(),
        phone: "".into(),
        email: "".into(),
        address: "".into(),
        zip: "".into(),
        license_number: "".into(),
    };
    let res = save_my_company_info(info).unwrap();
    assert!(res.success);
    let fetched = get_my_company_info().unwrap();
    assert_eq!(fetched.name, "   ");
}

#[test]
#[serial]
fn save_my_company_info_persists_changes() {
    let _db = TestDb::new();
    let res = save_my_company_info(MyCompanyInfo {
        id: 1,
        name: "DKSK".into(),
        phone: "808".into(),
        email: "ops@dksk.com".into(),
        address: "1 Paint".into(),
        zip: "96720".into(),
        license_number: "L1".into(),
    })
    .unwrap();
    assert!(res.success);
    let fetched = get_my_company_info().unwrap();
    assert_eq!(fetched.name, "DKSK");
    assert_eq!(fetched.phone, "808");
    assert_eq!(fetched.license_number, "L1");
}
