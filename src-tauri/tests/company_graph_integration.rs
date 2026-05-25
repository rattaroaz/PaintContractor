//! Integration tests for the Company graph: supervisors, properties, cascade
//! deletes, ensure_company_by_name, get_company_property_addresses.

mod common;

use common::fixtures::*;
use common::TestDb;
use paint_contractor_lib::commands::*;
use serial_test::serial;

fn make_company_with_one_property() -> i64 {
    let mut prop = make_property("Unit A");
    let mut sup = make_supervisor("Pat");
    prop.address = Some("123 Main".into());
    sup.properties = vec![prop];
    let mut c = make_company("Acme", 1000);
    c.supervisors = vec![sup];
    let saved = save_company(c).unwrap().data.expect("saved");
    saved.id
}

#[test]
#[serial]
fn save_company_persists_supervisors_and_properties() {
    let _db = TestDb::new();
    make_company_with_one_property();
    let companies = get_all_companies().unwrap();
    assert_eq!(companies.len(), 1);
    assert_eq!(companies[0].supervisors.len(), 1);
    assert_eq!(companies[0].supervisors[0].properties.len(), 1);
    assert_eq!(
        companies[0].supervisors[0].properties[0].address,
        Some("123 Main".into())
    );
}

#[test]
#[serial]
fn delete_company_cascades_to_supervisors_and_properties() {
    let _db = TestDb::new();
    let id = make_company_with_one_property();
    let res = delete_company(id).unwrap();
    assert!(res.success);

    let companies = get_all_companies().unwrap();
    assert!(companies.is_empty());

    // No supervisors / properties remain because the FK is ON DELETE CASCADE.
    let addresses = get_company_property_addresses("Acme".into()).unwrap();
    assert!(addresses.is_empty());
}

#[test]
#[serial]
fn delete_supervisor_removes_only_that_supervisor() {
    let _db = TestDb::new();
    let mut c = make_company("Acme", 1000);
    c.supervisors = vec![make_supervisor("Pat"), make_supervisor("Sam")];
    save_company(c).unwrap().data.expect("saved");
    // The insert path doesn't echo supervisor IDs back, so fetch from DB.
    let companies = get_all_companies().unwrap();
    let pat_id = companies[0]
        .supervisors
        .iter()
        .find(|s| s.name == "Pat")
        .unwrap()
        .id;
    delete_supervisor(pat_id).unwrap();
    let companies = get_all_companies().unwrap();
    assert_eq!(companies[0].supervisors.len(), 1);
    assert_eq!(companies[0].supervisors[0].name, "Sam");
}

#[test]
#[serial]
fn delete_property_removes_only_that_property() {
    let _db = TestDb::new();
    let mut sup = make_supervisor("Pat");
    sup.properties = vec![make_property("A"), make_property("B")];
    let mut c = make_company("Acme", 1000);
    c.supervisors = vec![sup];
    save_company(c).unwrap().data.expect("saved");
    let companies = get_all_companies().unwrap();
    let prop_id = companies[0].supervisors[0].properties[0].id;
    delete_property(prop_id).unwrap();
    let companies = get_all_companies().unwrap();
    assert_eq!(companies[0].supervisors[0].properties.len(), 1);
}

#[test]
#[serial]
fn ensure_company_by_name_creates_or_returns_existing() {
    let _db = TestDb::new();
    let first = ensure_company_by_name("Acme".into())
        .unwrap()
        .data
        .expect("created");
    assert!(first.id > 0);
    assert!(first.company_id >= 1000);

    let second = ensure_company_by_name("Acme".into())
        .unwrap()
        .data
        .expect("found");
    assert_eq!(first.id, second.id);
    assert_eq!(get_all_companies().unwrap().len(), 1);
}

#[test]
#[serial]
fn ensure_company_by_name_rejects_blank_input() {
    let _db = TestDb::new();
    let res = ensure_company_by_name("   ".into()).unwrap();
    assert!(!res.success);
    assert!(get_all_companies().unwrap().is_empty());
}

#[test]
#[serial]
fn get_company_property_addresses_resolves_via_supervisor_chain() {
    let _db = TestDb::new();
    make_company_with_one_property();
    let addresses = get_company_property_addresses("Acme".into()).unwrap();
    assert_eq!(addresses.len(), 1);
    let (addr_label, prop) = &addresses[0];
    assert_eq!(addr_label, "123 Main");
    assert_eq!(prop.address.as_deref(), Some("123 Main"));
}

#[test]
#[serial]
fn save_company_update_path_keeps_existing_supervisors_synced() {
    let _db = TestDb::new();
    let saved = {
        let mut c = make_company("Acme", 1000);
        c.supervisors = vec![make_supervisor("Pat")];
        save_company(c).unwrap().data.expect("saved")
    };

    let mut updated = saved.clone();
    updated.owner = Some("Jane".into());
    updated.supervisors.push(make_supervisor("Sam"));
    save_company(updated).unwrap().data.expect("updated");

    let companies = get_all_companies().unwrap();
    assert_eq!(companies[0].owner.as_deref(), Some("Jane"));
    let names: std::collections::BTreeSet<_> = companies[0]
        .supervisors
        .iter()
        .map(|s| s.name.as_str())
        .collect();
    assert!(names.contains("Pat"));
    assert!(names.contains("Sam"));
}
