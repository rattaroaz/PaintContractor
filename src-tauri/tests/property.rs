//! Property-based tests for the Rust backend using proptest. We assert
//! invariants over arbitrary inputs rather than fixed examples so shrinkage
//! finds the smallest counter-example automatically.

mod common;

use common::TestDb;
use paint_contractor_lib::commands::*;
use paint_contractor_lib::models::*;
use paint_contractor_lib::commands::CsvCompanyRow;
use proptest::prelude::*;
use serial_test::serial;

fn arb_description() -> impl Strategy<Value = String> {
    "[A-Za-z][A-Za-z0-9 _-]{0,15}".prop_map(|s| s.trim().to_string())
        .prop_filter("non-empty", |s| !s.is_empty())
}

proptest! {
    #![proptest_config(ProptestConfig {
        cases: 32,
        ..ProptestConfig::default()
    })]

    #[test]
    #[serial]
    fn upsert_job_idempotent_for_same_composite_key(
        desc in arb_description(),
        bed in 0i32..6,
        bath in 0i32..6,
        price1 in 0i32..10_000,
        price2 in 0i32..10_000,
    ) {
        let _db = TestDb::new();
        let first = upsert_job(JobDescription { id: 0, description: desc.clone(), size_bedroom: bed, size_bathroom: bath, price: price1 })
            .unwrap()
            .data
            .expect("saved");
        let second = upsert_job(JobDescription { id: 0, description: desc.clone(), size_bedroom: bed, size_bathroom: bath, price: price2 })
            .unwrap()
            .data
            .expect("saved");
        prop_assert_eq!(first.id, second.id);
        prop_assert_eq!(second.price, price2);
        prop_assert_eq!(get_all_jobs().unwrap().len(), 1);
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 16, ..ProptestConfig::default() })]

    #[test]
    #[serial]
    fn delete_jobs_by_description_zero_after_delete(
        descs in proptest::collection::vec(arb_description(), 1..=4),
    ) {
        let _db = TestDb::new();
        for d in &descs {
            upsert_job(JobDescription { id: 0, description: d.clone(), size_bedroom: 1, size_bathroom: 1, price: 10 }).unwrap();
        }
        let unique: std::collections::BTreeSet<&String> = descs.iter().collect();
        let total_before = get_all_jobs().unwrap().len();
        prop_assert_eq!(total_before, unique.len());

        for d in unique.iter() {
            delete_jobs_by_description((*d).clone()).unwrap();
        }
        prop_assert!(get_all_jobs().unwrap().is_empty());
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 16, ..ProptestConfig::default() })]

    #[test]
    #[serial]
    fn save_company_then_get_next_id_advances_by_one(
        name in "[A-Za-z][A-Za-z0-9 ]{0,8}",
    ) {
        let _db = TestDb::new();
        let next_before = get_next_company_id().unwrap();
        save_company(Company {
            id: 0,
            company_id: next_before,
            name,
            owner: None, phone: None, email: None, address: None,
            city: None, zip: None, special_note: None, supervisors: vec![],
        }).unwrap();
        let next_after = get_next_company_id().unwrap();
        prop_assert_eq!(next_after, next_before + 1);
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 16, ..ProptestConfig::default() })]

    /// `add_invoice` succeeds iff dates non-empty AND paid1 + paid2 <= cost,
    /// and a successful add returns a positive primary key.
    #[test]
    #[serial]
    fn add_invoice_iff_valid_payment_totals(
        cost in 0i32..1_000_000,
        p1 in 0i32..1_000_000,
        p2 in 0i32..1_000_000,
    ) {
        let _db = TestDb::new();
        let inv = paint_contractor_lib::models::Invoice {
            id: 0,
            todays_date: "2026-05-25".into(),
            work_date: "2026-05-20".into(),
            company_name: "Acme".into(),
            property_address: "1 Main".into(),
            unit: "A".into(),
            gate_code: None, lock_box: None,
            size_bedroom: 1, size_bathroom: 1,
            work_order: None,
            job_description_choice: "[]".into(),
            contractor_name: "Alex".into(),
            amount_cost: cost,
            amount_paid1: p1,
            date_paid1: None, check_number1: None,
            amount_paid2: p2,
            date_paid2: None, check_number2: None,
            invoice_created_date: None,
            special_note: None, garage_remote_code: None,
            status: 0,
        };
        let res = add_invoice(inv).unwrap();
        if p1.saturating_add(p2) > cost {
            prop_assert!(!res.success);
        } else {
            prop_assert!(res.success);
            prop_assert!(res.data.unwrap().id > 0);
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 16, ..ProptestConfig::default() })]

    /// `apply_receivable_payments` must:
    ///   1. Reject the entire batch if ANY row has paid > cost.
    ///   2. Mark each invoice that ends up fully paid in the message string.
    /// The proptest below enumerates {valid, overpaid} variants.
    #[test]
    #[serial]
    fn apply_receivable_payments_validates_each_row(
        cost in 1i32..1_000,
        p1 in 0i32..2_000,
    ) {
        let _db = TestDb::new();
        let seed_template = paint_contractor_lib::models::Invoice {
            id: 0,
            todays_date: "2026-05-25".into(),
            work_date: "2026-05-20".into(),
            company_name: "Acme".into(),
            property_address: "1 Main".into(),
            unit: "A".into(),
            gate_code: None, lock_box: None,
            size_bedroom: 1, size_bathroom: 1,
            work_order: None,
            job_description_choice: "[]".into(),
            contractor_name: "Alex".into(),
            amount_cost: cost,
            amount_paid1: 0,
            date_paid1: None, check_number1: None,
            amount_paid2: 0,
            date_paid2: None, check_number2: None,
            invoice_created_date: None,
            special_note: None, garage_remote_code: None,
            status: 1,
        };
        let saved = add_invoice(seed_template.clone()).unwrap().data.expect("added");
        let mut updated = seed_template.clone();
        updated.id = saved.id;
        updated.amount_paid1 = p1;
        let res = apply_receivable_payments(vec![updated]).unwrap();
        if p1 > cost {
            prop_assert!(!res.success);
        } else {
            prop_assert!(res.success);
            // "X fully paid" iff p1 >= cost
            let fully = if p1 >= cost { 1 } else { 0 };
            let expected = format!("{} fully paid", fully);
            prop_assert!(res.message.contains(&expected));
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 16, ..ProptestConfig::default() })]

    /// `replace_all_jobs` must always result in exactly the input set of rows.
    #[test]
    #[serial]
    fn replace_all_jobs_atomically_replaces_rows(
        prices in proptest::collection::vec(0i32..1_000, 1..=6),
    ) {
        let _db = TestDb::new();
        // Seed some pre-existing rows so we know they're cleared.
        upsert_job(JobDescription { id: 0, description: "Old".into(), size_bedroom: 1, size_bathroom: 1, price: 999 }).unwrap();

        let jobs: Vec<JobDescription> = prices.iter().enumerate().map(|(i, p)| JobDescription {
            id: 0,
            description: format!("J{}", i),
            size_bedroom: ((i % 5) + 1) as i32,
            size_bathroom: ((i % 5) + 1) as i32,
            price: *p,
        }).collect();
        replace_all_jobs(jobs.clone()).unwrap();
        let after = get_all_jobs().unwrap();
        prop_assert_eq!(after.len(), jobs.len());
        // Every saved job has a positive id (assigned by SQLite).
        prop_assert!(after.iter().all(|j| j.id > 0));
        // No surviving "Old" row.
        prop_assert!(!after.iter().any(|j| j.description == "Old"));
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 8, ..ProptestConfig::default() })]

    /// Importing the same companies CSV any number of times must converge to
    /// the same set of distinct names (idempotent under name dedupe).
    #[test]
    #[serial]
    fn import_companies_csv_is_name_idempotent(
        names in proptest::collection::vec("[A-Za-z][A-Za-z0-9]{0,6}", 1..=5),
    ) {
        let _db = TestDb::new();
        let build_rows = || -> Vec<CsvCompanyRow> {
            names.iter().map(|n| CsvCompanyRow {
                name: n.clone(),
                owner: None, phone: None, email: None, address: None,
                city: None, zip: None, special_note: None,
            }).collect()
        };
        import_companies_csv(build_rows()).unwrap();
        let first = get_all_companies().unwrap().len();
        import_companies_csv(build_rows()).unwrap();
        let second = get_all_companies().unwrap().len();
        prop_assert_eq!(first, second);

        let unique: std::collections::BTreeSet<&String> = names.iter().collect();
        prop_assert_eq!(first, unique.len());
    }
}
