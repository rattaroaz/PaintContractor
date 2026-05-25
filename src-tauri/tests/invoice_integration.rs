//! Integration tests for the full invoice lifecycle:
//! validation, CRUD, status filters, date-range filter, AR payments.

mod common;

use common::fixtures::*;
use common::TestDb;
use paint_contractor_lib::commands::*;
use serial_test::serial;

#[test]
#[serial]
fn add_invoice_rejects_missing_dates() {
    let _db = TestDb::new();
    let mut inv = make_invoice();
    inv.work_date.clear();
    let res = add_invoice(inv).unwrap();
    assert!(!res.success);
    assert!(res.message.contains("required"));
}

#[test]
#[serial]
fn add_invoice_rejects_overpayment() {
    let _db = TestDb::new();
    let mut inv = make_invoice();
    inv.amount_cost = 100;
    inv.amount_paid1 = 60;
    inv.amount_paid2 = 60;
    let res = add_invoice(inv).unwrap();
    assert!(!res.success);
    assert!(res.message.to_lowercase().contains("paid"));
}

#[test]
#[serial]
fn invoice_crud_roundtrip() {
    let _db = TestDb::new();
    let saved = add_invoice(make_invoice()).unwrap().data.expect("added");
    assert!(saved.id > 0);

    let mut update = saved.clone();
    update.amount_cost = 250;
    update.work_order = Some("WO-2".into());
    let updated = update_invoice(update).unwrap().data.expect("updated");
    assert_eq!(updated.amount_cost, 250);
    assert_eq!(updated.work_order, Some("WO-2".into()));

    let after = get_all_invoices().unwrap();
    assert_eq!(after.len(), 1);
    assert_eq!(after[0].id, saved.id);
    assert_eq!(after[0].amount_cost, 250);

    let del = delete_invoice(saved.id).unwrap();
    assert!(del.success);
    assert!(get_all_invoices().unwrap().is_empty());
}

#[test]
#[serial]
fn update_invoice_revalidates_payment_totals() {
    let _db = TestDb::new();
    let mut saved = add_invoice(make_invoice()).unwrap().data.expect("added");
    saved.amount_cost = 100;
    saved.amount_paid1 = 70;
    saved.amount_paid2 = 50;
    let res = update_invoice(saved).unwrap();
    assert!(!res.success);
}

#[test]
#[serial]
fn invoice_filters_by_status_match_spec() {
    let _db = TestDb::new();
    let mut a = make_invoice();
    a.status = 0;
    add_invoice(a).unwrap();
    let mut b = make_invoice();
    b.status = 1;
    add_invoice(b).unwrap();
    let mut c = make_invoice();
    c.status = 1;
    c.amount_paid1 = c.amount_cost; // fully paid
    add_invoice(c).unwrap();

    assert_eq!(get_invoices_active().unwrap().len(), 1, "Draft only");
    assert_eq!(
        get_invoices_sales().unwrap().len(),
        2,
        "Status>=1 counts as sales"
    );
    assert_eq!(
        get_invoices_receivable().unwrap().len(),
        2,
        "Cost > paid_total counts as receivable"
    );
}

#[test]
#[serial]
fn get_invoices_by_date_range_is_inclusive_and_draft_only() {
    let _db = TestDb::new();
    for (date, status) in [
        ("2026-01-01", 0),
        ("2026-06-15", 0),
        ("2026-12-31", 0),
        ("2026-06-15", 1), // submitted: must be excluded from range filter
    ] {
        let mut inv = make_invoice();
        inv.work_date = date.into();
        inv.status = status;
        add_invoice(inv).unwrap();
    }
    let result = get_invoices_by_date_range("2026-01-01".into(), "2026-06-15".into()).unwrap();
    assert_eq!(result.len(), 2, "boundary inclusive, status=0 only");
    assert!(result.iter().all(|i| i.status == 0));
}

#[test]
#[serial]
fn apply_receivable_payments_marks_fully_paid_and_rejects_overpayment() {
    let _db = TestDb::new();
    let saved = add_invoice({
        let mut i = make_invoice();
        i.amount_cost = 100;
        i.status = 1;
        i
    })
    .unwrap()
    .data
    .expect("added");

    let mut bad = saved.clone();
    bad.amount_paid1 = 120;
    let rejected = apply_receivable_payments(vec![bad]).unwrap();
    assert!(!rejected.success);

    let mut ok = saved.clone();
    ok.amount_paid1 = 100;
    let ok_res = apply_receivable_payments(vec![ok]).unwrap();
    assert!(ok_res.success);
    assert!(ok_res.message.contains("1 fully paid"));
}

#[test]
#[serial]
fn delete_invoice_is_safe_for_unknown_id() {
    let _db = TestDb::new();
    // delete_invoice intentionally returns ok even when nothing matched
    let res = delete_invoice(99_999).unwrap();
    assert!(res.success);
}
