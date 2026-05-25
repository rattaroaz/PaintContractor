//! Integration tests for CSV import commands. These exercise the Rust
//! receiving end (de-duplication, defaults, batching) over a temp DB.

mod common;

use common::TestDb;
use paint_contractor_lib::commands::*;
use serial_test::serial;

fn csv_company(name: &str) -> CsvCompanyRow {
    CsvCompanyRow {
        name: name.into(),
        owner: None,
        phone: None,
        email: None,
        address: None,
        city: None,
        zip: None,
        special_note: None,
    }
}

fn csv_property(name: &str, supervisor_name: Option<&str>) -> CsvPropertyRow {
    CsvPropertyRow {
        name: name.into(),
        supervisor_name: supervisor_name.map(str::to_string),
        supervisor_id: None,
        address: Some(format!("addr-{name}")),
        city: None,
        zip: None,
        gate_code: None,
        garage_remote_code: None,
        manager_name: None,
        manager_phone: None,
        manager_email: None,
        lock_box: None,
        special_note: None,
    }
}

fn csv_sales(company: &str, address: &str) -> CsvSalesRow {
    CsvSalesRow {
        work_date: "2026-05-20".into(),
        company_name: company.into(),
        property_address: address.into(),
        unit: Some("A".into()),
        size_bedroom: Some(2),
        size_bathroom: Some(1),
        work_order: Some("WO-CSV".into()),
        job_description_choice: Some("[]".into()),
        contractor_name: Some("Alex".into()),
        amount_cost: Some(150),
        amount_paid1: Some(50),
        date_paid1: Some("2026-05-25".into()),
        check_number1: Some("100".into()),
        amount_paid2: None,
        date_paid2: None,
        check_number2: None,
        special_note: None,
        gate_code: None,
        lock_box: None,
        garage_remote_code: None,
    }
}

#[test]
#[serial]
fn import_companies_skips_blank_and_duplicate_names() {
    let _db = TestDb::new();
    let rows = vec![
        csv_company("Acme"),
        csv_company(""),
        csv_company("   "),
        csv_company("Acme"),
        csv_company("Beta"),
    ];
    let res = import_companies_csv(rows).unwrap();
    assert!(res.success);
    assert_eq!(res.data, Some(2));
    let all = get_all_companies().unwrap();
    let names: Vec<_> = all.iter().map(|c| c.name.as_str()).collect();
    assert!(names.contains(&"Acme"));
    assert!(names.contains(&"Beta"));
    assert_eq!(all.len(), 2);
}

#[test]
#[serial]
fn import_companies_allocates_unique_company_ids() {
    let _db = TestDb::new();
    let rows = (0..5)
        .map(|i| csv_company(&format!("Co {i}")))
        .collect::<Vec<_>>();
    import_companies_csv(rows).unwrap();
    let companies = get_all_companies().unwrap();
    let mut ids: Vec<_> = companies.iter().map(|c| c.company_id).collect();
    ids.sort();
    let unique: std::collections::BTreeSet<_> = ids.iter().collect();
    assert_eq!(ids.len(), unique.len(), "CompanyIDs must be unique");
    assert!(ids.iter().all(|id| (1000..=9999).contains(id)));
}

#[test]
#[serial]
fn import_properties_attaches_to_existing_supervisor_and_skips_orphans() {
    let _db = TestDb::new();
    // Pre-create a company with a supervisor named "Pat" - properties CSV
    // requires an existing supervisor name.
    let c = paint_contractor_lib::models::Company {
        id: 0,
        company_id: 1000,
        name: "Acme".into(),
        owner: None,
        phone: None,
        email: None,
        address: None,
        city: None,
        zip: None,
        special_note: None,
        supervisors: vec![paint_contractor_lib::models::Supervisor {
            id: 0,
            name: "Pat".into(),
            phone: None,
            email: None,
            company_id: 0,
            properties: vec![],
        }],
    };
    save_company(c).unwrap().data.expect("saved");

    let res = import_properties_csv(vec![
        csv_property("Unit A", Some("Pat")),
        csv_property("Unit B", Some("Pat")),
        csv_property("Standalone", None), // skipped, no supervisor binding
    ])
    .unwrap();
    assert!(res.success);
    assert_eq!(res.data, Some(2));

    let companies = get_all_companies().unwrap();
    let pat = companies
        .iter()
        .flat_map(|c| c.supervisors.iter())
        .find(|s| s.name == "Pat")
        .expect("Pat still present");
    assert_eq!(pat.properties.len(), 2);
}

#[test]
#[serial]
fn import_sales_creates_invoices_with_defaults_filled_in() {
    let _db = TestDb::new();
    let res = import_sales_csv(vec![
        csv_sales("Acme", "1 Main"),
        csv_sales("Beta", "2 Oak"),
    ])
    .unwrap();
    assert!(res.success);
    assert_eq!(res.data, Some(2));

    let invoices = get_all_invoices().unwrap();
    assert_eq!(invoices.len(), 2);
    for inv in invoices {
        assert_eq!(inv.status, 1, "imported sales rows become Submitted");
        assert!(!inv.contractor_name.is_empty());
        assert!(inv.invoice_created_date.is_some());
        // ContractorName defaults to "N/A" when missing; here we pass "Alex"
        assert!(inv.contractor_name == "Alex" || inv.contractor_name == "N/A");
    }
}

#[test]
#[serial]
fn import_sales_handles_missing_optionals_via_defaults() {
    let _db = TestDb::new();
    let row = CsvSalesRow {
        work_date: "2026-05-20".into(),
        company_name: "X".into(),
        property_address: "Y".into(),
        unit: None,
        size_bedroom: None,
        size_bathroom: None,
        work_order: None,
        job_description_choice: None,
        contractor_name: None,
        amount_cost: None,
        amount_paid1: None,
        date_paid1: None,
        check_number1: None,
        amount_paid2: None,
        date_paid2: None,
        check_number2: None,
        special_note: None,
        gate_code: None,
        lock_box: None,
        garage_remote_code: None,
    };
    let res = import_sales_csv(vec![row]).unwrap();
    assert!(res.success);
    let inv = get_all_invoices().unwrap().pop().expect("inserted");
    assert_eq!(inv.unit, "");
    assert_eq!(inv.size_bedroom, 0);
    assert_eq!(inv.size_bathroom, 0);
    assert_eq!(inv.amount_cost, 0);
    assert_eq!(inv.contractor_name, "N/A");
    assert_eq!(inv.job_description_choice, "[]");
}
