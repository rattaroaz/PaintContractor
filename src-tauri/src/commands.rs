use crate::db::{self, get_all_config_with_prefix, next_company_id, set_config_value, with_conn, with_transaction};
use crate::log_util::{self, LoggingPaths};
use crate::models::{*, UpdateConfig};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use tauri::Manager;

fn row_invoice(row: &rusqlite::Row<'_>) -> Result<Invoice, rusqlite::Error> {
    Ok(Invoice {
        id: row.get(0)?,
        todays_date: row.get(1)?,
        work_date: row.get(2)?,
        company_name: row.get(3)?,
        property_address: row.get(4)?,
        unit: row.get(5)?,
        gate_code: row.get(6)?,
        lock_box: row.get(7)?,
        size_bedroom: row.get(8)?,
        size_bathroom: row.get(9)?,
        work_order: row.get(10)?,
        job_description_choice: row.get(11)?,
        contractor_name: row.get(12)?,
        amount_cost: row.get(13)?,
        amount_paid1: row.get(14)?,
        date_paid1: row.get(15)?,
        check_number1: row.get(16)?,
        amount_paid2: row.get(17)?,
        date_paid2: row.get(18)?,
        check_number2: row.get(19)?,
        invoice_created_date: row.get(20)?,
        special_note: row.get(21)?,
        garage_remote_code: row.get(22)?,
        status: row.get(23)?,
    })
}

fn validate_invoice(inv: &Invoice) -> Option<String> {
    if inv.todays_date.is_empty() || inv.work_date.is_empty() {
        return Some("TodaysDate and WorkDate are required.".to_string());
    }
    if inv.amount_paid1 + inv.amount_paid2 > inv.amount_cost {
        return Some("Combined paid amount cannot be greater than amount cost.".to_string());
    }
    None
}

#[tauri::command]
pub fn get_logging_paths(app: tauri::AppHandle) -> LoggingPaths {
    log_util::run_value("get_logging_paths", None, || {
        let log_directory = app
            .path()
            .app_log_dir()
            .map(|p| p.display().to_string())
            .unwrap_or_else(|e| format!("(unavailable: {e})"));
        LoggingPaths {
            database_path: db::db_path().display().to_string(),
            log_directory,
        }
    })
}

#[tauri::command]
pub fn get_database_path() -> String {
    log_util::run_value("get_database_path", None, || {
        db::db_path().display().to_string()
    })
}

#[tauri::command]
pub fn create_database_backup() -> Result<Vec<u8>, String> {
    log_util::run("create_database_backup", Some("action=backup"), || {
        db::backup_bytes()
    })
}

#[tauri::command]
pub fn restore_database_file(bytes: Vec<u8>) -> Result<(), String> {
    log_util::run(
        "restore_database_file",
        Some(&format!("bytes={}", bytes.len())),
        || db::restore_db(&bytes),
    )
}

#[tauri::command]
pub fn get_my_company_info() -> Result<MyCompanyInfo, String> {
    log_util::run("get_my_company_info", None, || {
        with_conn(|conn| {
            conn.query_row(
            "SELECT Id, Name, Phone, Email, Address, Zip, LicenseNumber FROM MyCompanyInfo LIMIT 1",
            [],
            |r| {
                Ok(MyCompanyInfo {
                    id: r.get(0)?,
                    name: r.get(1)?,
                    phone: r.get(2)?,
                    email: r.get(3)?,
                    address: r.get(4)?,
                    zip: r.get(5)?,
                    license_number: r.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
pub fn save_my_company_info(info: MyCompanyInfo) -> Result<OperationResult<MyCompanyInfo>, String> {
    log_util::run(
        "save_my_company_info",
        Some(&format!("id={}", info.id)),
        || {
            if info.name.trim().is_empty() {
                return Ok(OperationResult::err("Name is required."));
            }
            with_conn(|conn| {
                conn.execute(
            "UPDATE MyCompanyInfo SET Name=?1, Phone=?2, Email=?3, Address=?4, Zip=?5, LicenseNumber=?6 WHERE Id=?7",
            params![
                info.name,
                info.phone,
                info.email,
                info.address,
                info.zip,
                info.license_number,
                info.id
            ],
        )
        .map_err(|e| e.to_string())?;
                Ok(OperationResult::ok_msg(info, "Company profile saved."))
            })
        },
    )
}

fn load_properties(
    conn: &rusqlite::Connection,
    supervisor_id: i64,
) -> Result<Vec<Property>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT Id, Name, Address, City, Zip, GateCode, GarageRemoteCode, LockBox, SpecialNote,
             ManagerName, ManagerPhone, ManagerEmail, IsActive, SupervisorId FROM Properties WHERE SupervisorId=?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([supervisor_id], |r| {
            Ok(Property {
                id: r.get(0)?,
                name: r.get(1)?,
                address: r.get(2)?,
                city: r.get(3)?,
                zip: r.get(4)?,
                gate_code: r.get(5)?,
                garage_remote_code: r.get(6)?,
                lock_box: r.get(7)?,
                special_note: r.get(8)?,
                manager_name: r.get(9)?,
                manager_phone: r.get(10)?,
                manager_email: r.get(11)?,
                is_active: r.get::<_, Option<i32>>(12)?.map(|v| v != 0),
                supervisor_id: r.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_companies() -> Result<Vec<Company>, String> {
    log_util::run("get_all_companies", None, || {
        with_conn(|conn| {
            let mut companies = Vec::new();
            let mut stmt = conn
                    .prepare("SELECT Id, CompanyID, Name, Owner, Phone, Email, Address, City, Zip, SpecialNote FROM Company ORDER BY Name")
                    .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |r| {
                    Ok((
                        r.get::<_, i64>(0)?,
                        r.get::<_, i32>(1)?,
                        r.get::<_, String>(2)?,
                        r.get::<_, Option<String>>(3)?,
                        r.get::<_, Option<String>>(4)?,
                        r.get::<_, Option<String>>(5)?,
                        r.get::<_, Option<String>>(6)?,
                        r.get::<_, Option<String>>(7)?,
                        r.get::<_, Option<String>>(8)?,
                        r.get::<_, Option<String>>(9)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (id, company_id, name, owner, phone, email, address, city, zip, special_note) =
                    row.map_err(|e| e.to_string())?;
                let mut sup_stmt = conn
                        .prepare("SELECT Id, Name, Phone, Email, CompanyId FROM Supervisor WHERE CompanyId=?1")
                        .map_err(|e| e.to_string())?;
                let sup_rows = sup_stmt
                    .query_map([id], |r| {
                        Ok((
                            r.get::<_, i64>(0)?,
                            r.get::<_, String>(1)?,
                            r.get::<_, Option<String>>(2)?,
                            r.get::<_, Option<String>>(3)?,
                            r.get::<_, i64>(4)?,
                        ))
                    })
                    .map_err(|e| e.to_string())?;
                let mut supervisors = Vec::new();
                for s in sup_rows {
                    let (sid, sname, sphone, semail, scid) = s.map_err(|e| e.to_string())?;
                    supervisors.push(Supervisor {
                        id: sid,
                        name: sname,
                        phone: sphone,
                        email: semail,
                        company_id: scid,
                        properties: load_properties(conn, sid)?,
                    });
                }
                companies.push(Company {
                    id,
                    company_id,
                    name,
                    owner,
                    phone,
                    email,
                    address,
                    city,
                    zip,
                    special_note,
                    supervisors,
                });
            }
            Ok(companies)
        })
    })
}

fn company_name_exists(
    conn: &rusqlite::Connection,
    name: &str,
    exclude_id: i64,
) -> Result<bool, String> {
    let found: Option<i64> = conn
        .query_row(
            "SELECT Id FROM Company WHERE TRIM(Name) = TRIM(?1) AND Id != ?2",
            params![name, exclude_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(found.is_some())
}

fn company_id_exists(
    conn: &rusqlite::Connection,
    company_id: i32,
    exclude_id: i64,
) -> Result<bool, String> {
    let found: Option<i64> = conn
        .query_row(
            "SELECT Id FROM Company WHERE CompanyID = ?1 AND Id != ?2",
            params![company_id, exclude_id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(found.is_some())
}

#[tauri::command]
pub fn get_next_company_id() -> Result<i32, String> {
    log_util::run("get_next_company_id", None, || with_conn(next_company_id))
}

#[tauri::command]
pub fn save_company(company: Company) -> Result<OperationResult<Company>, String> {
    log_util::run(
        "save_company",
        Some(&format!(
            "id={} company_id={}",
            company.id, company.company_id
        )),
        || {
            let name = company.name.trim().to_string();
            if name.is_empty() {
                return Ok(OperationResult::err("Company name is required."));
            }
            if company.company_id < 1000 || company.company_id > 9999 {
                return Ok(OperationResult::err(
                    "Company ID must be between 1000 and 9999.",
                ));
            }

            with_conn(|conn| {
                if company.id == 0 {
                    if company_name_exists(conn, &name, 0)? {
                        return Ok(OperationResult::err(
                            "A company with this name already exists.",
                        ));
                    }
                    if company_id_exists(conn, company.company_id, 0)? {
                        return Ok(OperationResult::err(
                            "This Company ID is already in use. Choose another ID or use the suggested next ID.",
                        ));
                    }
                    conn.execute(
                        "INSERT INTO Company (CompanyID, Name, Owner, Phone, Email, Address, City, Zip, SpecialNote) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                        params![
                            company.company_id,
                            name,
                            company.owner,
                            company.phone,
                            company.email,
                            company.address,
                            company.city,
                            company.zip,
                            company.special_note
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                    let id = conn.last_insert_rowid();
                    save_supervisors(conn, id, &company.supervisors)?;
                    let mut saved = company;
                    saved.id = id;
                    saved.name = name;
                    return Ok(OperationResult::ok(saved));
                }

                if company_name_exists(conn, &name, company.id)? {
                    return Ok(OperationResult::err(
                        "A company with this name already exists.",
                    ));
                }
                if company_id_exists(conn, company.company_id, company.id)? {
                    return Ok(OperationResult::err("This Company ID is already in use."));
                }

                conn.execute(
                    "UPDATE Company SET CompanyID=?1, Name=?2, Owner=?3, Phone=?4, Email=?5, Address=?6, City=?7, Zip=?8, SpecialNote=?9 WHERE Id=?10",
                    params![
                        company.company_id,
                        name,
                        company.owner,
                        company.phone,
                        company.email,
                        company.address,
                        company.city,
                        company.zip,
                        company.special_note,
                        company.id
                    ],
                )
                .map_err(|e| e.to_string())?;
                for sup in &company.supervisors {
                    if sup.id == 0 {
                        conn.execute(
                            "INSERT INTO Supervisor (Name, Phone, Email, CompanyId) VALUES (?1,?2,?3,?4)",
                            params![sup.name, sup.phone, sup.email, company.id],
                        )
                        .map_err(|e| e.to_string())?;
                        let sid = conn.last_insert_rowid();
                        save_properties(conn, sid, &sup.properties)?;
                    } else {
                        conn.execute(
                            "UPDATE Supervisor SET Name=?1, Phone=?2, Email=?3 WHERE Id=?4",
                            params![sup.name, sup.phone, sup.email, sup.id],
                        )
                        .map_err(|e| e.to_string())?;
                        save_properties(conn, sup.id, &sup.properties)?;
                    }
                }
                let mut saved = company;
                saved.name = name;
                Ok(OperationResult::ok(saved))
            })
        },
    )
}

fn save_supervisors(
    conn: &rusqlite::Connection,
    company_id: i64,
    supervisors: &[Supervisor],
) -> Result<(), String> {
    for sup in supervisors {
        conn.execute(
            "INSERT INTO Supervisor (Name, Phone, Email, CompanyId) VALUES (?1,?2,?3,?4)",
            params![sup.name, sup.phone, sup.email, company_id],
        )
        .map_err(|e| e.to_string())?;
        let sid = conn.last_insert_rowid();
        save_properties(conn, sid, &sup.properties)?;
    }
    Ok(())
}

fn save_properties(
    conn: &rusqlite::Connection,
    supervisor_id: i64,
    properties: &[Property],
) -> Result<(), String> {
    for p in properties {
        let active = p.is_active.map(|b| if b { 1 } else { 0 });
        if p.id == 0 {
            conn.execute(
                "INSERT INTO Properties (Name, Address, City, Zip, GateCode, GarageRemoteCode, LockBox, SpecialNote, ManagerName, ManagerPhone, ManagerEmail, IsActive, SupervisorId) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
                params![
                    p.name,
                    p.address,
                    p.city,
                    p.zip,
                    p.gate_code,
                    p.garage_remote_code,
                    p.lock_box,
                    p.special_note,
                    p.manager_name,
                    p.manager_phone,
                    p.manager_email,
                    active,
                    supervisor_id
                ],
            )
            .map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "UPDATE Properties SET Name=?1, Address=?2, City=?3, Zip=?4, GateCode=?5, GarageRemoteCode=?6, LockBox=?7, SpecialNote=?8, ManagerName=?9, ManagerPhone=?10, ManagerEmail=?11, IsActive=?12 WHERE Id=?13",
                params![
                    p.name,
                    p.address,
                    p.city,
                    p.zip,
                    p.gate_code,
                    p.garage_remote_code,
                    p.lock_box,
                    p.special_note,
                    p.manager_name,
                    p.manager_phone,
                    p.manager_email,
                    active,
                    p.id
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn ensure_company_by_name(name: String) -> Result<OperationResult<Company>, String> {
    log_util::run(
        "ensure_company_by_name",
        Some(&format!("name={}", name)),
        || {
            let trimmed = name.trim().to_string();
            if trimmed.is_empty() {
                return Ok(OperationResult::err("Company name is required."));
            }
            with_conn(|conn| {
                let existing: Option<Company> = {
                    let mut stmt = conn
                        .prepare("SELECT Id, CompanyID, Name, Owner, Phone, Email, Address, City, Zip, SpecialNote FROM Company WHERE TRIM(Name)=TRIM(?1)")
                        .map_err(|e| e.to_string())?;
                    stmt.query_row([&trimmed], |r| {
                        Ok(Company {
                            id: r.get(0)?,
                            company_id: r.get(1)?,
                            name: r.get(2)?,
                            owner: r.get(3)?,
                            phone: r.get(4)?,
                            email: r.get(5)?,
                            address: r.get(6)?,
                            city: r.get(7)?,
                            zip: r.get(8)?,
                            special_note: r.get(9)?,
                            supervisors: vec![],
                        })
                    })
                    .optional()
                    .map_err(|e| e.to_string())?
                };
                if let Some(c) = existing {
                    return Ok(OperationResult::ok(c));
                }
                let cid = next_company_id(conn)?;
                conn.execute(
                    "INSERT INTO Company (CompanyID, Name) VALUES (?1, ?2)",
                    params![cid, trimmed],
                )
                .map_err(|e| e.to_string())?;
                let id = conn.last_insert_rowid();
                Ok(OperationResult::ok(Company {
                    id,
                    company_id: cid,
                    name: trimmed,
                    owner: None,
                    phone: None,
                    email: None,
                    address: None,
                    city: None,
                    zip: None,
                    special_note: None,
                    supervisors: vec![],
                }))
            })
        },
    )
}

#[tauri::command]
pub fn delete_company(company_id: i64) -> Result<OperationResult<()>, String> {
    log_util::run(
        "delete_company",
        Some(&format!("company_id={}", company_id)),
        || {
            with_conn(|conn| {
                let n = conn
                    .execute("DELETE FROM Company WHERE Id=?1", [company_id])
                    .map_err(|e| e.to_string())?;
                if n == 0 {
                    Ok(OperationResult::err("Company not found."))
                } else {
                    Ok(OperationResult::ok_msg((), "Company deleted."))
                }
            })
        },
    )
}

#[tauri::command]
pub fn delete_supervisor(id: i64) -> Result<(), String> {
    log_util::run("delete_supervisor", Some(&format!("id={}", id)), || {
        with_conn(|conn| {
            conn.execute("DELETE FROM Supervisor WHERE Id=?1", [id])
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    })
}

#[tauri::command]
pub fn delete_property(id: i64) -> Result<(), String> {
    log_util::run("delete_property", Some(&format!("id={}", id)), || {
        with_conn(|conn| {
            conn.execute("DELETE FROM Properties WHERE Id=?1", [id])
                .map_err(|e| e.to_string())?;
            Ok(())
        })
    })
}

#[tauri::command]
pub fn get_company_property_addresses(
    company_name: String,
) -> Result<Vec<(String, Property)>, String> {
    log_util::run(
        "get_company_property_addresses",
        Some(&format!("company={}", company_name)),
        || {
            with_conn(|conn| {
                let mut out = Vec::new();
                let mut stmt = conn
                    .prepare(
                        "SELECT p.Id, p.Name, p.Address, p.City, p.Zip, p.GateCode, p.GarageRemoteCode, p.LockBox, p.SpecialNote,
                         p.ManagerName, p.ManagerPhone, p.ManagerEmail, p.IsActive, p.SupervisorId, COALESCE(p.Address, p.Name)
                         FROM Properties p
                         JOIN Supervisor s ON p.SupervisorId = s.Id
                         JOIN Company c ON s.CompanyId = c.Id
                         WHERE c.Name = ?1",
                    )
                    .map_err(|e| e.to_string())?;
                let rows = stmt
                    .query_map([&company_name], |r| {
                        let addr: String = r.get(14)?;
                        let prop = Property {
                            id: r.get(0)?,
                            name: r.get(1)?,
                            address: r.get(2)?,
                            city: r.get(3)?,
                            zip: r.get(4)?,
                            gate_code: r.get(5)?,
                            garage_remote_code: r.get(6)?,
                            lock_box: r.get(7)?,
                            special_note: r.get(8)?,
                            manager_name: r.get(9)?,
                            manager_phone: r.get(10)?,
                            manager_email: r.get(11)?,
                            is_active: r.get::<_, Option<i32>>(12)?.map(|v| v != 0),
                            supervisor_id: r.get(13)?,
                        };
                        Ok((addr, prop))
                    })
                    .map_err(|e| e.to_string())?;
                for row in rows {
                    out.push(row.map_err(|e| e.to_string())?);
                }
                Ok(out)
            })
        },
    )
}

#[tauri::command]
pub fn get_all_contractors() -> Result<Vec<Contractor>, String> {
    log_util::run("get_all_contractors", None, || {
        with_conn(|conn| {
            let mut stmt = conn
                    .prepare(
                        "SELECT Id, Name, LicenseNumber, SocialSecurityNumber, ContractorID, PayrollPercent, CellPhone, Email, Address, City, Zip, SpecialNote, IsActive FROM Contractor ORDER BY Name",
                    )
                    .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |r| {
                    Ok(Contractor {
                        id: r.get(0)?,
                        name: r.get(1)?,
                        license_number: r.get(2)?,
                        social_security_number: r.get(3)?,
                        contractor_id: r.get(4)?,
                        payroll_percent: r.get(5)?,
                        cell_phone: r.get(6)?,
                        email: r.get(7)?,
                        address: r.get(8)?,
                        city: r.get(9)?,
                        zip: r.get(10)?,
                        special_note: r.get(11)?,
                        is_active: r.get::<_, Option<i32>>(12)?.map(|v| v != 0),
                    })
                })
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
pub fn save_contractor(contractor: Contractor) -> Result<OperationResult<Contractor>, String> {
    log_util::run("save_contractor", None, || {
        with_conn(|conn| {
            if contractor.id == 0 {
                let dup: Option<i64> = conn
                    .query_row(
                        "SELECT Id FROM Contractor WHERE Name=?1",
                        [&contractor.name],
                        |r| r.get(0),
                    )
                    .optional()
                    .map_err(|e| e.to_string())?;
                if dup.is_some() {
                    return Ok(OperationResult::err(
                        "A contractor with this name already exists.",
                    ));
                }
                conn.execute(
                        "INSERT INTO Contractor (Name, LicenseNumber, SocialSecurityNumber, ContractorID, PayrollPercent, CellPhone, Email, Address, City, Zip, SpecialNote, IsActive) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                        params![
                            contractor.name,
                            contractor.license_number,
                            contractor.social_security_number,
                            contractor.contractor_id,
                            contractor.payroll_percent,
                            contractor.cell_phone,
                            contractor.email,
                            contractor.address,
                            contractor.city,
                            contractor.zip,
                            contractor.special_note,
                            contractor.is_active.map(|b| if b { 1 } else { 0 })
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                let id = conn.last_insert_rowid();
                let mut c = contractor;
                c.id = id;
                return Ok(OperationResult::ok(c));
            }
            conn.execute(
                    "UPDATE Contractor SET Name=?1, LicenseNumber=?2, SocialSecurityNumber=?3, ContractorID=?4, PayrollPercent=?5, CellPhone=?6, Email=?7, Address=?8, City=?9, Zip=?10, SpecialNote=?11, IsActive=?12 WHERE Id=?13",
                    params![
                        contractor.name,
                        contractor.license_number,
                        contractor.social_security_number,
                        contractor.contractor_id,
                        contractor.payroll_percent,
                        contractor.cell_phone,
                        contractor.email,
                        contractor.address,
                        contractor.city,
                        contractor.zip,
                        contractor.special_note,
                        contractor.is_active.map(|b| if b { 1 } else { 0 }),
                        contractor.id
                    ],
                )
                .map_err(|e| e.to_string())?;
            Ok(OperationResult::ok(contractor))
        })
    })
}

#[tauri::command]
pub fn delete_contractor(id: i64) -> Result<OperationResult<()>, String> {
    log_util::run("delete_contractor", Some(&format!("id={}", id)), || {
        with_conn(|conn| {
            let n = conn
                .execute("DELETE FROM Contractor WHERE Id=?1", [id])
                .map_err(|e| e.to_string())?;
            if n == 0 {
                Ok(OperationResult::err("Contractor not found."))
            } else {
                Ok(OperationResult::ok_msg((), "Contractor deleted."))
            }
        })
    })
}

#[tauri::command]
pub fn get_all_jobs() -> Result<Vec<JobDescription>, String> {
    log_util::run("get_all_jobs", None, || {
        with_conn(|conn| {
            let mut stmt = conn
                    .prepare("SELECT Id, description, sizeBedroom, sizeBathroom, price FROM JobDescription ORDER BY description")
                    .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |r| {
                    Ok(JobDescription {
                        id: r.get(0)?,
                        description: r.get(1)?,
                        size_bedroom: r.get(2)?,
                        size_bathroom: r.get(3)?,
                        price: r.get(4)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())
        })
    })
}

#[tauri::command]
pub fn replace_all_jobs(jobs: Vec<JobDescription>) -> Result<OperationResult<()>, String> {
    log_util::run(
        "replace_all_jobs",
        Some(&format!("count={}", jobs.len())),
        || {
            with_transaction(|tx| {
                tx.execute("DELETE FROM JobDescription", [])
                    .map_err(|e| e.to_string())?;
                for j in jobs {
                    tx.execute(
                        "INSERT INTO JobDescription (description, sizeBedroom, sizeBathroom, price) VALUES (?1,?2,?3,?4)",
                        params![j.description, j.size_bedroom, j.size_bathroom, j.price],
                    )
                    .map_err(|e| e.to_string())?;
                }
                Ok(OperationResult::ok_msg((), "Job catalog saved."))
            })
        },
    )
}

#[tauri::command]
pub fn find_job_by_key(
    description: String,
    size_bedroom: i32,
    size_bathroom: i32,
) -> Result<Option<JobDescription>, String> {
    log_util::run(
        "find_job_by_key",
        Some(&format!("description={}", description)),
        || {
            with_conn(|conn| {
                conn.query_row(
                    "SELECT Id, description, sizeBedroom, sizeBathroom, price FROM JobDescription WHERE description = ?1 AND sizeBedroom = ?2 AND sizeBathroom = ?3",
                    params![description, size_bedroom, size_bathroom],
                    |r| {
                        Ok(JobDescription {
                            id: r.get(0)?,
                            description: r.get(1)?,
                            size_bedroom: r.get(2)?,
                            size_bathroom: r.get(3)?,
                            price: r.get(4)?,
                        })
                    },
                )
                .optional()
                .map_err(|e| e.to_string())
            })
        },
    )
}

#[tauri::command]
pub fn upsert_job(job: JobDescription) -> Result<OperationResult<JobDescription>, String> {
    log_util::run("upsert_job", None, || {
        let desc = job.description.trim().to_string();
        if desc.is_empty() {
            return Ok(OperationResult::err("Job description is required."));
        }
        with_conn(|conn| {
            let existing_id: Option<i64> = conn
                    .query_row(
                        "SELECT Id FROM JobDescription WHERE description = ?1 AND sizeBedroom = ?2 AND sizeBathroom = ?3",
                        params![desc, job.size_bedroom, job.size_bathroom],
                        |r| r.get(0),
                    )
                    .optional()
                    .map_err(|e| e.to_string())?;

            if let Some(id) = existing_id {
                conn.execute(
                    "UPDATE JobDescription SET price = ?1 WHERE Id = ?2",
                    params![job.price, id],
                )
                .map_err(|e| e.to_string())?;
                Ok(OperationResult::ok(JobDescription {
                    id,
                    description: desc,
                    size_bedroom: job.size_bedroom,
                    size_bathroom: job.size_bathroom,
                    price: job.price,
                }))
            } else {
                conn.execute(
                        "INSERT INTO JobDescription (description, sizeBedroom, sizeBathroom, price) VALUES (?1,?2,?3,?4)",
                        params![desc, job.size_bedroom, job.size_bathroom, job.price],
                    )
                    .map_err(|e| e.to_string())?;
                let id = conn.last_insert_rowid();
                Ok(OperationResult::ok(JobDescription {
                    id,
                    description: desc,
                    size_bedroom: job.size_bedroom,
                    size_bathroom: job.size_bathroom,
                    price: job.price,
                }))
            }
        })
    })
}

#[tauri::command]
pub fn delete_job(id: i64) -> Result<OperationResult<()>, String> {
    log_util::run("delete_job", Some(&format!("id={}", id)), || {
        with_conn(|conn| {
            let n = conn
                .execute("DELETE FROM JobDescription WHERE Id=?1", [id])
                .map_err(|e| e.to_string())?;
            if n == 0 {
                Ok(OperationResult::err("Job not found."))
            } else {
                Ok(OperationResult::ok_msg((), "Job removed."))
            }
        })
    })
}

/// Removes every catalog price row for this job description (all bedroom/bathroom variants).
#[tauri::command]
pub fn delete_jobs_by_description(description: String) -> Result<OperationResult<i32>, String> {
    log_util::run(
        "delete_jobs_by_description",
        Some(&format!("description={}", description)),
        || {
            let desc = description.trim().to_string();
            if desc.is_empty() {
                return Ok(OperationResult::ok_msg(0, "Nothing to delete."));
            }
            with_conn(|conn| {
                let n = conn
                    .execute(
                        "DELETE FROM JobDescription WHERE TRIM(description) = TRIM(?1)",
                        [&desc],
                    )
                    .map_err(|e| e.to_string())?;
                Ok(OperationResult::ok_msg(
                    n as i32,
                    &format!("Removed {} price row(s) for this job.", n),
                ))
            })
        },
    )
}

fn query_invoices(conn: &rusqlite::Connection, where_clause: &str) -> Result<Vec<Invoice>, String> {
    let sql = format!(
        "SELECT Id, TodaysDate, WorkDate, CompanyName, PropertyAddress, Unit, GateCode, LockBox, SizeBedroom, SizeBathroom, WorkOrder, JobDescriptionChoice, ContractorName, AmountCost, AmountPaid1, DatePaid1, CheckNumber1, AmountPaid2, DatePaid2, CheckNumber2, InvoiceCreatedDate, SpecialNote, GarageRemoteCode, Status FROM Invoice {}",
        where_clause
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_invoice).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_invoices() -> Result<Vec<Invoice>, String> {
    log_util::run("get_all_invoices", None, || {
        with_conn(|conn| query_invoices(conn, "ORDER BY WorkDate DESC"))
    })
}

#[tauri::command]
pub fn get_invoices_by_date_range(start: String, end: String) -> Result<Vec<Invoice>, String> {
    log_util::run(
        "get_invoices_by_date_range",
        Some(&format!("start={} end={}", start, end)),
        || {
            with_conn(|conn| {
                let mut stmt = conn
                    .prepare(
                        "SELECT Id, TodaysDate, WorkDate, CompanyName, PropertyAddress, Unit, GateCode, LockBox, SizeBedroom, SizeBathroom, WorkOrder, JobDescriptionChoice, ContractorName, AmountCost, AmountPaid1, DatePaid1, CheckNumber1, AmountPaid2, DatePaid2, CheckNumber2, InvoiceCreatedDate, SpecialNote, GarageRemoteCode, Status FROM Invoice WHERE Status=0 AND WorkDate >= ?1 AND WorkDate <= ?2 ORDER BY WorkDate",
                    )
                    .map_err(|e| e.to_string())?;
                let rows = stmt
                    .query_map(params![start, end], row_invoice)
                    .map_err(|e| e.to_string())?;
                rows.collect::<Result<Vec<_>, _>>()
                    .map_err(|e| e.to_string())
            })
        },
    )
}

#[tauri::command]
pub fn get_invoices_receivable() -> Result<Vec<Invoice>, String> {
    log_util::run("get_invoices_receivable", None, || {
        with_conn(|conn| {
            query_invoices(
                conn,
                "WHERE AmountCost > (AmountPaid1 + AmountPaid2) ORDER BY WorkDate DESC",
            )
        })
    })
}

#[tauri::command]
pub fn get_invoices_sales() -> Result<Vec<Invoice>, String> {
    log_util::run("get_invoices_sales", None, || {
        with_conn(|conn| query_invoices(conn, "WHERE Status=1 ORDER BY WorkDate DESC"))
    })
}

#[tauri::command]
pub fn get_invoices_active() -> Result<Vec<Invoice>, String> {
    log_util::run("get_invoices_active", None, || {
        with_conn(|conn| query_invoices(conn, "WHERE Status=0 ORDER BY WorkDate DESC"))
    })
}

#[tauri::command]
pub fn add_invoice(mut invoice: Invoice) -> Result<OperationResult<Invoice>, String> {
    log_util::run(
        "add_invoice",
        Some(&format!("invoice_id={}", invoice.id)),
        || {
            if let Some(msg) = validate_invoice(&invoice) {
                return Ok(OperationResult::err(&msg));
            }
            with_conn(|conn| {
                conn.execute(
                    "INSERT INTO Invoice (TodaysDate, WorkDate, CompanyName, PropertyAddress, Unit, GateCode, LockBox, SizeBedroom, SizeBathroom, WorkOrder, JobDescriptionChoice, ContractorName, AmountCost, AmountPaid1, DatePaid1, CheckNumber1, AmountPaid2, DatePaid2, CheckNumber2, InvoiceCreatedDate, SpecialNote, GarageRemoteCode, Status) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
                    params![
                        invoice.todays_date,
                        invoice.work_date,
                        invoice.company_name,
                        invoice.property_address,
                        invoice.unit,
                        invoice.gate_code,
                        invoice.lock_box,
                        invoice.size_bedroom,
                        invoice.size_bathroom,
                        invoice.work_order,
                        invoice.job_description_choice,
                        invoice.contractor_name,
                        invoice.amount_cost,
                        invoice.amount_paid1,
                        invoice.date_paid1,
                        invoice.check_number1,
                        invoice.amount_paid2,
                        invoice.date_paid2,
                        invoice.check_number2,
                        invoice.invoice_created_date,
                        invoice.special_note,
                        invoice.garage_remote_code,
                        invoice.status
                    ],
                )
                .map_err(|e| e.to_string())?;
                invoice.id = conn.last_insert_rowid();
                Ok(OperationResult::ok(invoice))
            })
        },
    )
}

#[tauri::command]
pub fn update_invoice(invoice: Invoice) -> Result<OperationResult<Invoice>, String> {
    log_util::run(
        "update_invoice",
        Some(&format!("invoice_id={}", invoice.id)),
        || {
            if let Some(msg) = validate_invoice(&invoice) {
                return Ok(OperationResult::err(&msg));
            }
            with_conn(|conn| {
                conn.execute(
                    "UPDATE Invoice SET TodaysDate=?1, WorkDate=?2, CompanyName=?3, PropertyAddress=?4, Unit=?5, GateCode=?6, LockBox=?7, SizeBedroom=?8, SizeBathroom=?9, WorkOrder=?10, JobDescriptionChoice=?11, ContractorName=?12, AmountCost=?13, AmountPaid1=?14, DatePaid1=?15, CheckNumber1=?16, AmountPaid2=?17, DatePaid2=?18, CheckNumber2=?19, InvoiceCreatedDate=?20, SpecialNote=?21, GarageRemoteCode=?22, Status=?23 WHERE Id=?24",
                    params![
                        invoice.todays_date,
                        invoice.work_date,
                        invoice.company_name,
                        invoice.property_address,
                        invoice.unit,
                        invoice.gate_code,
                        invoice.lock_box,
                        invoice.size_bedroom,
                        invoice.size_bathroom,
                        invoice.work_order,
                        invoice.job_description_choice,
                        invoice.contractor_name,
                        invoice.amount_cost,
                        invoice.amount_paid1,
                        invoice.date_paid1,
                        invoice.check_number1,
                        invoice.amount_paid2,
                        invoice.date_paid2,
                        invoice.check_number2,
                        invoice.invoice_created_date,
                        invoice.special_note,
                        invoice.garage_remote_code,
                        invoice.status,
                        invoice.id
                    ],
                )
                .map_err(|e| e.to_string())?;
                Ok(OperationResult::ok(invoice))
            })
        },
    )
}

#[tauri::command]
pub fn delete_invoice(id: i64) -> Result<OperationResult<()>, String> {
    log_util::run("delete_invoice", Some(&format!("id={}", id)), || {
        with_conn(|conn| {
            conn.execute("DELETE FROM Invoice WHERE Id=?1", [id])
                .map_err(|e| e.to_string())?;
            Ok(OperationResult::ok_msg((), "Invoice deleted."))
        })
    })
}

#[tauri::command]
pub fn apply_receivable_payments(
    invoices: Vec<Invoice>,
) -> Result<OperationResult<String>, String> {
    log_util::run(
        "apply_receivable_payments",
        Some(&format!("count={}", invoices.len())),
        || {
            for inv in &invoices {
                if inv.amount_paid1 + inv.amount_paid2 > inv.amount_cost {
                    return Ok(OperationResult::err(
                        "The paid amount can not be greater than amount due!",
                    ));
                }
            }
            let mut updated = 0;
            let mut fully_paid = 0;
            with_conn(|conn| {
                for inv in invoices {
                    conn.execute(
                        "UPDATE Invoice SET AmountPaid1=?1, DatePaid1=?2, CheckNumber1=?3, AmountPaid2=?4, DatePaid2=?5, CheckNumber2=?6 WHERE Id=?7",
                        params![
                            inv.amount_paid1,
                            inv.date_paid1,
                            inv.check_number1,
                            inv.amount_paid2,
                            inv.date_paid2,
                            inv.check_number2,
                            inv.id
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                    updated += 1;
                    if inv.amount_paid1 + inv.amount_paid2 >= inv.amount_cost {
                        fully_paid += 1;
                    }
                }
                Ok(OperationResult {
                    success: true,
                    message: format!("Updated {} invoice(s). {} fully paid.", updated, fully_paid),
                    data: Some(format!(
                        "Updated {} invoice(s). {} fully paid.",
                        updated, fully_paid
                    )),
                })
            })
        },
    )
}

#[derive(Deserialize)]
pub struct CsvCompanyRow {
    pub name: String,
    pub owner: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub zip: Option<String>,
    pub special_note: Option<String>,
}

#[tauri::command]
pub fn import_companies_csv(rows: Vec<CsvCompanyRow>) -> Result<OperationResult<i32>, String> {
    log_util::run(
        "import_companies_csv",
        Some(&format!("rows={}", rows.len())),
        || {
            with_transaction(|tx| {
                let mut count = 0;
                for row in rows {
                    if row.name.trim().is_empty() {
                        continue;
                    }
                    let exists: Option<i64> = tx
                        .query_row("SELECT Id FROM Company WHERE Name=?1", [&row.name], |r| {
                            r.get(0)
                        })
                        .optional()
                        .map_err(|e| e.to_string())?;
                    if exists.is_some() {
                        continue;
                    }
                    let cid = next_company_id(tx)?;
                    tx.execute(
                        "INSERT INTO Company (CompanyID, Name, Owner, Phone, Email, Address, City, Zip, SpecialNote) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                        params![
                            cid,
                            row.name,
                            row.owner,
                            row.phone,
                            row.email,
                            row.address,
                            row.city,
                            row.zip,
                            row.special_note
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                    count += 1;
                }
                Ok(OperationResult::ok_msg(
                    count,
                    &format!("Imported {} companies.", count),
                ))
            })
        },
    )
}

#[derive(Deserialize)]
pub struct CsvPropertyRow {
    pub name: String,
    pub supervisor_name: Option<String>,
    pub supervisor_id: Option<i64>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub zip: Option<String>,
    pub gate_code: Option<String>,
    pub garage_remote_code: Option<String>,
    pub manager_name: Option<String>,
    pub manager_phone: Option<String>,
    pub manager_email: Option<String>,
    pub lock_box: Option<String>,
    pub special_note: Option<String>,
}

#[tauri::command]
pub fn import_properties_csv(rows: Vec<CsvPropertyRow>) -> Result<OperationResult<i32>, String> {
    log_util::run(
        "import_properties_csv",
        Some(&format!("rows={}", rows.len())),
        || {
            with_transaction(|tx| {
                let mut count = 0;
                for row in rows {
                    let sid = if let Some(id) = row.supervisor_id {
                        id
                    } else if let Some(ref sn) = row.supervisor_name {
                        tx.query_row(
                            "SELECT Id FROM Supervisor WHERE Name=?1 LIMIT 1",
                            [sn],
                            |r| r.get::<_, i64>(0),
                        )
                        .map_err(|e| e.to_string())?
                    } else {
                        continue;
                    };
                    tx.execute(
                        "INSERT INTO Properties (Name, Address, City, Zip, GateCode, GarageRemoteCode, LockBox, SpecialNote, ManagerName, ManagerPhone, ManagerEmail, SupervisorId) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                        params![
                            row.name,
                            row.address,
                            row.city,
                            row.zip,
                            row.gate_code,
                            row.garage_remote_code,
                            row.lock_box,
                            row.special_note,
                            row.manager_name,
                            row.manager_phone,
                            row.manager_email,
                            sid
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                    count += 1;
                }
                Ok(OperationResult::ok_msg(
                    count,
                    &format!("Imported {} properties.", count),
                ))
            })
        },
    )
}

#[derive(Deserialize)]
pub struct CsvSalesRow {
    pub work_date: String,
    pub company_name: String,
    pub property_address: String,
    pub unit: Option<String>,
    pub size_bedroom: Option<i32>,
    pub size_bathroom: Option<i32>,
    pub work_order: Option<String>,
    pub job_description_choice: Option<String>,
    pub contractor_name: Option<String>,
    pub amount_cost: Option<i32>,
    pub amount_paid1: Option<i32>,
    pub date_paid1: Option<String>,
    pub check_number1: Option<String>,
    pub amount_paid2: Option<i32>,
    pub date_paid2: Option<String>,
    pub check_number2: Option<String>,
    pub special_note: Option<String>,
    pub gate_code: Option<String>,
    pub lock_box: Option<String>,
    pub garage_remote_code: Option<String>,
}

#[tauri::command]
pub fn import_sales_csv(rows: Vec<CsvSalesRow>) -> Result<OperationResult<i32>, String> {
    log_util::run(
        "import_sales_csv",
        Some(&format!("rows={}", rows.len())),
        || {
            with_transaction(|tx| {
                let mut count = 0;
                let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
                for row in rows {
                    let inv = Invoice {
                        id: 0,
                        todays_date: today.clone(),
                        work_date: row.work_date.clone(),
                        company_name: row.company_name,
                        property_address: row.property_address,
                        unit: row.unit.unwrap_or_else(|| "".to_string()),
                        gate_code: row.gate_code,
                        lock_box: row.lock_box,
                        size_bedroom: row.size_bedroom.unwrap_or(0),
                        size_bathroom: row.size_bathroom.unwrap_or(0),
                        work_order: row.work_order,
                        job_description_choice: row
                            .job_description_choice
                            .unwrap_or_else(|| "[]".to_string()),
                        contractor_name: row.contractor_name.unwrap_or_else(|| "N/A".to_string()),
                        amount_cost: row.amount_cost.unwrap_or(0),
                        amount_paid1: row.amount_paid1.unwrap_or(0),
                        date_paid1: row.date_paid1,
                        check_number1: row.check_number1,
                        amount_paid2: row.amount_paid2.unwrap_or(0),
                        date_paid2: row.date_paid2,
                        check_number2: row.check_number2,
                        invoice_created_date: Some(today.clone()),
                        special_note: row.special_note,
                        garage_remote_code: row.garage_remote_code,
                        status: 1,
                    };
                    tx.execute(
                        "INSERT INTO Invoice (TodaysDate, WorkDate, CompanyName, PropertyAddress, Unit, GateCode, LockBox, SizeBedroom, SizeBathroom, WorkOrder, JobDescriptionChoice, ContractorName, AmountCost, AmountPaid1, DatePaid1, CheckNumber1, AmountPaid2, DatePaid2, CheckNumber2, InvoiceCreatedDate, SpecialNote, GarageRemoteCode, Status) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)",
                        params![
                            inv.todays_date,
                            inv.work_date,
                            inv.company_name,
                            inv.property_address,
                            inv.unit,
                            inv.gate_code,
                            inv.lock_box,
                            inv.size_bedroom,
                            inv.size_bathroom,
                            inv.work_order,
                            inv.job_description_choice,
                            inv.contractor_name,
                            inv.amount_cost,
                            inv.amount_paid1,
                            inv.date_paid1,
                            inv.check_number1,
                            inv.amount_paid2,
                            inv.date_paid2,
                            inv.check_number2,
                            inv.invoice_created_date,
                            inv.special_note,
                            inv.garage_remote_code,
                            inv.status
                        ],
                    )
                    .map_err(|e| e.to_string())?;
                    count += 1;
                }
                Ok(OperationResult::ok_msg(
                    count,
                    &format!("Imported {} sales rows.", count),
                ))
            })
        },
    )
}

#[tauri::command]
pub fn get_app_version() -> String {
    log_util::run_value("get_app_version", None, || {
        env!("CARGO_PKG_VERSION").to_string()
    })
}

// --- Real auto-update config (persisted in AppConfig) ---

#[tauri::command]
pub fn get_update_config() -> UpdateConfig {
    log_util::run_value("get_update_config", None, || {
        let map = get_all_config_with_prefix("update.").unwrap_or_default();
        UpdateConfig {
            repository_owner: map
                .get("update.repository_owner")
                .cloned()
                .unwrap_or_else(|| "rattaroaz".into()),
            repository_name: map
                .get("update.repository_name")
                .cloned()
                .unwrap_or_else(|| "DKSKMaui".into()),
            check_on_startup: map
                .get("update.check_on_startup")
                .map(|v| v == "true")
                .unwrap_or(true),
            enabled: map
                .get("update.enabled")
                .map(|v| v == "true")
                .unwrap_or(false),
            last_check: map.get("update.last_check").cloned(),
        }
    })
}

#[tauri::command]
pub fn save_update_config(cfg: UpdateConfig) -> Result<OperationResult<()>, String> {
    log_util::run("save_update_config", None, || {
        set_config_value("update.repository_owner", &cfg.repository_owner)?;
        set_config_value("update.repository_name", &cfg.repository_name)?;
        set_config_value("update.check_on_startup", if cfg.check_on_startup { "true" } else { "false" })?;
        set_config_value("update.enabled", if cfg.enabled { "true" } else { "false" })?;
        if let Some(ts) = &cfg.last_check {
            set_config_value("update.last_check", ts)?;
        }
        Ok(OperationResult::ok_msg((), "Update settings saved."))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn invoice_with(cost: i32, p1: i32, p2: i32) -> Invoice {
        Invoice {
            id: 0,
            todays_date: "2026-05-25".into(),
            work_date: "2026-05-20".into(),
            company_name: "Acme".into(),
            property_address: "1 Main".into(),
            unit: "A".into(),
            gate_code: None,
            lock_box: None,
            size_bedroom: 1,
            size_bathroom: 1,
            work_order: None,
            job_description_choice: "[]".into(),
            contractor_name: "Alex".into(),
            amount_cost: cost,
            amount_paid1: p1,
            date_paid1: None,
            check_number1: None,
            amount_paid2: p2,
            date_paid2: None,
            check_number2: None,
            invoice_created_date: None,
            special_note: None,
            garage_remote_code: None,
            status: 0,
        }
    }

    #[test]
    fn validate_invoice_accepts_valid_payment_totals() {
        assert!(validate_invoice(&invoice_with(100, 25, 25)).is_none());
        assert!(validate_invoice(&invoice_with(100, 100, 0)).is_none());
        assert!(validate_invoice(&invoice_with(0, 0, 0)).is_none());
    }

    #[test]
    fn validate_invoice_rejects_overpayment() {
        let err = validate_invoice(&invoice_with(50, 30, 25)).unwrap();
        assert!(err.contains("Combined paid"));
    }

    #[test]
    fn validate_invoice_rejects_missing_dates() {
        let mut inv = invoice_with(100, 0, 0);
        inv.work_date.clear();
        assert!(validate_invoice(&inv).is_some());
        let mut inv2 = invoice_with(100, 0, 0);
        inv2.todays_date.clear();
        assert!(validate_invoice(&inv2).is_some());
    }

    #[test]
    fn get_app_version_returns_non_empty_semver_like_string() {
        let v = get_app_version();
        assert!(!v.is_empty());
        assert!(v.chars().next().unwrap().is_ascii_digit());
    }
}
