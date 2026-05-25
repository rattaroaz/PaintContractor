//! Integration tests for payroll-style queries:
//!   - contractor CRUD
//!   - filtering invoices by contractor (payroll/contractor-jobs pages)
//!   - status driven aggregates (sales vs draft)

mod common;

use common::fixtures::*;
use common::TestDb;
use paint_contractor_lib::commands::*;
use serial_test::serial;

#[test]
#[serial]
fn contractor_crud_roundtrip() {
    let _db = TestDb::new();

    let mut alex = make_contractor("Alex");
    alex.name = "Alex Painter".into();
    let saved = save_contractor(alex.clone()).unwrap().data.expect("saved");
    assert!(saved.id > 0, "id allocated");

    let mut updated = saved.clone();
    updated.payroll_percent = Some("15".into());
    updated.special_note = Some("Bonus eligible".into());
    let after = save_contractor(updated.clone())
        .unwrap()
        .data
        .expect("updated");
    assert_eq!(after.payroll_percent, Some("15".into()));
    assert_eq!(after.special_note, Some("Bonus eligible".into()));

    let listed = get_all_contractors().unwrap();
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].id, saved.id);

    let res = delete_contractor(saved.id).unwrap();
    assert!(res.success);
    assert!(get_all_contractors().unwrap().is_empty());
}

#[test]
#[serial]
fn invoices_by_contractor_filter_through_status_buckets() {
    let _db = TestDb::new();

    let alex = save_contractor({
        let mut c = make_contractor("seed");
        c.name = "Alex Painter".into();
        c
    })
    .unwrap()
    .data
    .expect("saved");

    let _bob = save_contractor({
        let mut c = make_contractor("seed");
        c.name = "Bob Painter".into();
        c
    })
    .unwrap()
    .data
    .expect("saved");

    // Two for Alex, one for Bob — different status mixes.
    for (name, status, cost, paid) in [
        ("Alex Painter", 0, 100, 0),  // draft
        ("Alex Painter", 1, 200, 200), // sale + paid (not receivable)
        ("Bob Painter", 1, 300, 0),   // sale + receivable
    ] {
        let mut inv = make_invoice();
        inv.contractor_name = name.into();
        inv.status = status;
        inv.amount_cost = cost;
        inv.amount_paid1 = paid;
        add_invoice(inv).unwrap();
    }

    let actives = get_invoices_active().unwrap();
    let sales = get_invoices_sales().unwrap();
    let receivables = get_invoices_receivable().unwrap();

    let alex_active = actives.iter().filter(|i| i.contractor_name == alex.name).count();
    let alex_sales = sales.iter().filter(|i| i.contractor_name == alex.name).count();
    let alex_rec = receivables
        .iter()
        .filter(|i| i.contractor_name == alex.name)
        .count();

    assert_eq!(alex_active, 1, "1 draft for Alex");
    assert_eq!(alex_sales, 1, "1 sale for Alex");
    // Receivable is amount-based (cost > paid_total) regardless of status. Alex's
    // draft (cost=100, paid=0) counts as receivable; the fully-paid sale doesn't.
    assert_eq!(alex_rec, 1, "Alex has 1 outstanding (the draft)");

    let bob_rec = receivables
        .iter()
        .filter(|i| i.contractor_name == "Bob Painter")
        .count();
    assert_eq!(bob_rec, 1, "Bob has 1 outstanding sale");
}

#[test]
#[serial]
fn payroll_aggregation_sums_paid_amounts_per_contractor() {
    let _db = TestDb::new();

    let _ = save_contractor({
        let mut c = make_contractor("seed");
        c.name = "Alex Painter".into();
        c
    })
    .unwrap();

    for amt in [200, 350, 75] {
        let mut inv = make_invoice();
        inv.contractor_name = "Alex Painter".into();
        inv.status = 1;
        inv.amount_cost = amt;
        inv.amount_paid1 = amt;
        add_invoice(inv).unwrap();
    }

    let all = get_all_invoices().unwrap();
    let alex_total: i32 = all
        .iter()
        .filter(|i| i.contractor_name == "Alex Painter")
        .map(|i| i.amount_paid1 + i.amount_paid2)
        .sum();
    assert_eq!(alex_total, 625);
}
