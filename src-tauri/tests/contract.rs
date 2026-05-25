//! Contract tests verifying the serialized JSON shape of Rust models matches
//! what the TypeScript types expect. We assert field names + types using
//! `serde_json::Value` shape checks. If a model changes, both this test and
//! the matching `src/types.ts` interface must be updated, keeping them in sync.

use paint_contractor_lib::models::*;
use serde_json::{json, Value};

fn assert_keys(v: &Value, expected: &[&str]) {
    let obj = v.as_object().expect("object");
    let actual: std::collections::BTreeSet<&str> = obj.keys().map(String::as_str).collect();
    let expected_set: std::collections::BTreeSet<&str> = expected.iter().copied().collect();
    assert_eq!(
        actual, expected_set,
        "Serialized keys drifted from the TS contract.\nExpected: {:?}\nActual:   {:?}",
        expected_set, actual
    );
}

#[test]
fn company_serializes_with_snake_case_keys() {
    let v = serde_json::to_value(Company {
        id: 1,
        company_id: 1001,
        name: "Acme".into(),
        owner: None,
        phone: None,
        email: None,
        address: None,
        city: None,
        zip: None,
        special_note: None,
        supervisors: vec![],
    })
    .unwrap();
    assert_keys(
        &v,
        &[
            "id",
            "company_id",
            "name",
            "owner",
            "phone",
            "email",
            "address",
            "city",
            "zip",
            "special_note",
            "supervisors",
        ],
    );
    assert_eq!(v["supervisors"], json!([]));
}

#[test]
fn job_description_keys_match_typescript() {
    let v = serde_json::to_value(JobDescription {
        id: 1,
        description: "Paint".into(),
        size_bedroom: 2,
        size_bathroom: 2,
        price: 100,
    })
    .unwrap();
    assert_keys(
        &v,
        &[
            "id",
            "description",
            "size_bedroom",
            "size_bathroom",
            "price",
        ],
    );
}

#[test]
fn invoice_keys_match_typescript() {
    let v = serde_json::to_value(Invoice {
        id: 1,
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
        status: 0,
    })
    .unwrap();
    assert_keys(
        &v,
        &[
            "id",
            "todays_date",
            "work_date",
            "company_name",
            "property_address",
            "unit",
            "gate_code",
            "lock_box",
            "size_bedroom",
            "size_bathroom",
            "work_order",
            "job_description_choice",
            "contractor_name",
            "amount_cost",
            "amount_paid1",
            "date_paid1",
            "check_number1",
            "amount_paid2",
            "date_paid2",
            "check_number2",
            "invoice_created_date",
            "special_note",
            "garage_remote_code",
            "status",
        ],
    );
}

#[test]
fn operation_result_envelope_serializes_success_and_data() {
    let v = serde_json::to_value(OperationResult::ok(JobDescription {
        id: 1,
        description: "Paint".into(),
        size_bedroom: 1,
        size_bathroom: 1,
        price: 50,
    }))
    .unwrap();
    assert_keys(&v, &["success", "message", "data"]);
    assert_eq!(v["success"], json!(true));
}

#[test]
fn operation_result_failure_includes_message_and_no_data() {
    let v = serde_json::to_value(OperationResult::<()>::err("nope")).unwrap();
    let obj = v.as_object().unwrap();
    assert!(obj.contains_key("success"));
    assert!(obj.contains_key("message"));
    assert!(
        !obj.contains_key("data"),
        "data should be skipped when None"
    );
    assert_eq!(v["success"], json!(false));
    assert_eq!(v["message"], json!("nope"));
}

#[test]
fn my_company_info_keys_match_typescript() {
    let v = serde_json::to_value(MyCompanyInfo {
        id: 1,
        name: "DKSK".into(),
        phone: "1".into(),
        email: "a@b.c".into(),
        address: "x".into(),
        zip: "1".into(),
        license_number: "L".into(),
    })
    .unwrap();
    assert_keys(
        &v,
        &[
            "id",
            "name",
            "phone",
            "email",
            "address",
            "zip",
            "license_number",
        ],
    );
}

#[test]
fn supervisor_keys_match_typescript() {
    let v = serde_json::to_value(Supervisor {
        id: 1,
        name: "Pat".into(),
        phone: None,
        email: None,
        company_id: 5,
        properties: vec![],
    })
    .unwrap();
    assert_keys(
        &v,
        &["id", "name", "phone", "email", "company_id", "properties"],
    );
}

#[test]
fn property_keys_match_typescript() {
    let v = serde_json::to_value(Property {
        id: 1,
        name: "Unit".into(),
        address: None,
        city: None,
        zip: None,
        gate_code: None,
        garage_remote_code: None,
        lock_box: None,
        special_note: None,
        manager_name: None,
        manager_phone: None,
        manager_email: None,
        is_active: Some(true),
        supervisor_id: 5,
    })
    .unwrap();
    assert_keys(
        &v,
        &[
            "id",
            "name",
            "address",
            "city",
            "zip",
            "gate_code",
            "garage_remote_code",
            "lock_box",
            "special_note",
            "manager_name",
            "manager_phone",
            "manager_email",
            "is_active",
            "supervisor_id",
        ],
    );
}

#[test]
fn contractor_keys_match_typescript() {
    let v = serde_json::to_value(Contractor {
        id: 1,
        name: "Alex".into(),
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
        is_active: None,
    })
    .unwrap();
    assert_keys(
        &v,
        &[
            "id",
            "name",
            "license_number",
            "social_security_number",
            "contractor_id",
            "payroll_percent",
            "cell_phone",
            "email",
            "address",
            "city",
            "zip",
            "special_note",
            "is_active",
        ],
    );
}

#[test]
fn invoice_amounts_serialize_as_integers() {
    let v = serde_json::to_value(Invoice {
        id: 1,
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
        amount_cost: 250,
        amount_paid1: 100,
        date_paid1: None,
        check_number1: None,
        amount_paid2: 0,
        date_paid2: None,
        check_number2: None,
        invoice_created_date: None,
        special_note: None,
        garage_remote_code: None,
        status: 1,
    })
    .unwrap();
    assert!(v["amount_cost"].is_i64());
    assert!(v["amount_paid1"].is_i64());
    assert!(v["size_bedroom"].is_i64());
    assert_eq!(v["status"], json!(1));
}

#[test]
fn invoice_status_round_trips_for_known_values() {
    for s in 0..=2 {
        let inv = Invoice {
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
            status: s,
        };
        let json = serde_json::to_string(&inv).unwrap();
        let back: Invoice = serde_json::from_str(&json).unwrap();
        assert_eq!(back.status, s);
    }
}

#[test]
fn deserializing_unknown_extra_fields_is_tolerated() {
    let payload = serde_json::json!({
        "id": 1,
        "name": "Acme",
        "phone": "1", "email": "a", "address": "b", "zip": "c",
        "license_number": "L",
        "unexpected": "field",
    });
    let res: Result<MyCompanyInfo, _> = serde_json::from_value(payload);
    assert!(res.is_ok());
}
