use log::{info, warn};
use rusqlite::{Connection, OptionalExtension, Transaction};
use std::path::PathBuf;
use std::sync::Mutex;

static DB: Mutex<Option<Connection>> = Mutex::new(None);

pub fn db_path() -> PathBuf {
    if let Ok(custom) = std::env::var("PAINT_CONTRACTOR_DB_PATH") {
        let path = PathBuf::from(custom);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        return path;
    }
    let base = dirs::data_local_dir().unwrap_or_else(std::env::temp_dir);
    let dir = base.join("PaintContractor").join("Database");
    std::fs::create_dir_all(&dir).ok();
    dir.join("app.db")
}

/// Resets the global connection so a subsequent `init_db()` reopens against
/// the (possibly env-overridden) path. Hidden from documentation because it is
/// only intended for use by the integration test suite.
#[doc(hidden)]
pub fn reset_for_tests() {
    if let Ok(mut guard) = DB.lock() {
        *guard = None;
    }
}

pub fn init_db() -> Result<(), String> {
    let path = db_path();
    info!("Initializing SQLite at {}", path.display());
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        CREATE TABLE IF NOT EXISTS MyCompanyInfo (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL DEFAULT '',
            Phone TEXT NOT NULL DEFAULT '',
            Email TEXT NOT NULL DEFAULT '',
            Address TEXT NOT NULL DEFAULT '',
            Zip TEXT NOT NULL DEFAULT '',
            LicenseNumber TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS Company (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            CompanyID INTEGER NOT NULL UNIQUE,
            Name TEXT NOT NULL,
            Owner TEXT,
            Phone TEXT,
            Email TEXT,
            Address TEXT,
            City TEXT,
            Zip TEXT,
            SpecialNote TEXT
        );
        CREATE TABLE IF NOT EXISTS Supervisor (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL,
            Phone TEXT,
            Email TEXT,
            CompanyId INTEGER NOT NULL REFERENCES Company(Id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Properties (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL DEFAULT '',
            Address TEXT,
            City TEXT,
            Zip TEXT,
            GateCode TEXT,
            GarageRemoteCode TEXT,
            LockBox TEXT,
            SpecialNote TEXT,
            ManagerName TEXT,
            ManagerPhone TEXT,
            ManagerEmail TEXT,
            IsActive INTEGER,
            SupervisorId INTEGER NOT NULL REFERENCES Supervisor(Id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Contractor (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Name TEXT NOT NULL UNIQUE,
            LicenseNumber TEXT,
            SocialSecurityNumber TEXT,
            ContractorID TEXT,
            PayrollPercent TEXT,
            CellPhone TEXT,
            Email TEXT,
            Address TEXT,
            City TEXT,
            Zip TEXT,
            SpecialNote TEXT,
            IsActive INTEGER
        );
        CREATE TABLE IF NOT EXISTS JobDescription (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL DEFAULT '',
            sizeBedroom INTEGER NOT NULL DEFAULT 0,
            sizeBathroom INTEGER NOT NULL DEFAULT 0,
            price INTEGER NOT NULL DEFAULT 0
        );
        CREATE UNIQUE INDEX IF NOT EXISTS IX_JobDescription_Description_Bed_Bath
            ON JobDescription (description, sizeBedroom, sizeBathroom);
        CREATE TABLE IF NOT EXISTS Invoice (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            TodaysDate TEXT NOT NULL,
            WorkDate TEXT NOT NULL,
            CompanyName TEXT NOT NULL,
            PropertyAddress TEXT NOT NULL,
            Unit TEXT NOT NULL,
            GateCode TEXT,
            LockBox TEXT,
            SizeBedroom INTEGER NOT NULL DEFAULT 0,
            SizeBathroom INTEGER NOT NULL DEFAULT 0,
            WorkOrder TEXT,
            JobDescriptionChoice TEXT NOT NULL DEFAULT '[]',
            ContractorName TEXT NOT NULL,
            AmountCost INTEGER NOT NULL DEFAULT 0,
            AmountPaid1 INTEGER NOT NULL DEFAULT 0,
            DatePaid1 TEXT,
            CheckNumber1 TEXT,
            AmountPaid2 INTEGER NOT NULL DEFAULT 0,
            DatePaid2 TEXT,
            CheckNumber2 TEXT,
            InvoiceCreatedDate TEXT,
            SpecialNote TEXT,
            GarageRemoteCode TEXT,
            Status INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS AppConfig (
            Key TEXT PRIMARY KEY,
            Value TEXT
        );
        ",
    )
    .map_err(|e| e.to_string())?;
    ensure_defaults(&conn)?;
    *DB.lock().map_err(|e| e.to_string())? = Some(conn);
    Ok(())
}

pub fn with_conn<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let guard = DB.lock().map_err(|e| e.to_string())?;
    let conn = guard
        .as_ref()
        .ok_or_else(|| "Database not initialized".to_string())?;
    f(conn)
}

/// Executes `f` inside a single SQLite transaction.
/// On success the transaction is committed; on error it is rolled back
/// and the original error is returned. This guarantees atomicity for
/// multi-statement bulk operations (replace_all, CSV imports).
pub fn with_transaction<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce(&Transaction) -> Result<T, String>,
{
    with_conn(|conn| {
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        let result = f(&tx);
        if result.is_ok() {
            tx.commit().map_err(|e| e.to_string())?;
        } else {
            let _ = tx.rollback();
        }
        result
    })
}

fn ensure_defaults(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM MyCompanyInfo", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if count == 0 {
        conn.execute(
            "INSERT INTO MyCompanyInfo (Name, Phone, Email, Address, Zip, LicenseNumber) VALUES ('', '', '', '', '', '')",
            [],
        )
        .map_err(|e| e.to_string())?;
    }
    let inv_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM Invoice", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    if inv_count == 0 {
        conn.execute(
            "DELETE FROM Company WHERE Name IN ('Demo Company', 'Sample Client')",
            [],
        )
        .ok();
        conn.execute(
            "DELETE FROM Contractor WHERE Name IN ('Demo Contractor', 'Sample Sub')",
            [],
        )
        .ok();
    }

    // Seed update config (safe defaults: disabled until user configures + publishes signed releases)
    let cfg_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM AppConfig WHERE Key LIKE 'update.%'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if cfg_count == 0 {
        let defaults = [
            ("update.repository_owner", "rattaroaz"),
            ("update.repository_name", "PaintContractor"),
            ("update.check_on_startup", "false"),
            ("update.enabled", "false"),
        ];
        for (k, v) in defaults {
            conn.execute(
                "INSERT OR IGNORE INTO AppConfig (Key, Value) VALUES (?1, ?2)",
                [k, v],
            )
            .ok();
        }
    }
    Ok(())
}

pub fn restore_db(bytes: &[u8]) -> Result<(), String> {
    warn!("Restoring database from backup ({} bytes)", bytes.len());
    if bytes.len() < 16 || &bytes[0..16] != b"SQLite format 3\0" {
        return Err("Invalid SQLite database file".to_string());
    }
    let path = db_path();
    let backup = format!(
        "{}.backup_{}",
        path.display(),
        chrono::Local::now().format("%Y%m%d_%H%M%S")
    );
    if path.exists() {
        std::fs::copy(&path, &backup).map_err(|e| e.to_string())?;
    }
    *DB.lock().map_err(|e| e.to_string())? = None;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    let wal = path.with_extension("db-wal");
    let shm = path.with_extension("db-shm");
    let _ = std::fs::remove_file(wal);
    let _ = std::fs::remove_file(shm);
    init_db()?;
    info!("Database restore completed");
    Ok(())
}

pub fn backup_bytes() -> Result<Vec<u8>, String> {
    with_conn(|conn| {
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| e.to_string())?;
        Ok(())
    })?;
    let bytes = std::fs::read(db_path()).map_err(|e| e.to_string())?;
    info!("Database backup read ({} bytes)", bytes.len());
    Ok(bytes)
}

pub fn next_company_id(conn: &Connection) -> Result<i32, String> {
    for id in 1000..=9999 {
        let exists: Option<i64> = conn
            .query_row("SELECT Id FROM Company WHERE CompanyID = ?1", [id], |r| {
                r.get(0)
            })
            .optional()
            .map_err(|e| e.to_string())?;
        if exists.is_none() {
            return Ok(id);
        }
    }
    Err("No available CompanyID in range 1000-9999".to_string())
}

// --- AppConfig (key-value) helpers for updater settings + future extensibility ---

pub fn get_config_value(key: &str) -> Result<Option<String>, String> {
    with_conn(|conn| {
        let val: Option<String> = conn
            .query_row("SELECT Value FROM AppConfig WHERE Key = ?1", [key], |r| {
                r.get(0)
            })
            .optional()
            .map_err(|e| e.to_string())?;
        Ok(val)
    })
}

pub fn set_config_value(key: &str, value: &str) -> Result<(), String> {
    with_conn(|conn| {
        conn.execute(
            "INSERT INTO AppConfig (Key, Value) VALUES (?1, ?2)
             ON CONFLICT(Key) DO UPDATE SET Value = excluded.Value",
            [key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    })
}

pub fn get_all_config_with_prefix(
    prefix: &str,
) -> Result<std::collections::HashMap<String, String>, String> {
    with_conn(|conn| {
        let mut stmt = conn
            .prepare("SELECT Key, Value FROM AppConfig WHERE Key LIKE ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([format!("{}%", prefix)], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        let mut map = std::collections::HashMap::new();
        for row in rows {
            let (k, v) = row.map_err(|e| e.to_string())?;
            map.insert(k, v);
        }
        Ok(map)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::params;

    fn fresh_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE Company (Id INTEGER PRIMARY KEY AUTOINCREMENT, CompanyID INTEGER NOT NULL UNIQUE, Name TEXT NOT NULL);",
        )
        .unwrap();
        conn
    }

    #[test]
    fn next_company_id_returns_1000_when_empty() {
        let conn = fresh_conn();
        assert_eq!(next_company_id(&conn).unwrap(), 1000);
    }

    #[test]
    fn next_company_id_skips_taken_ids() {
        let conn = fresh_conn();
        conn.execute(
            "INSERT INTO Company (CompanyID, Name) VALUES (?1, ?2)",
            params![1000, "Acme"],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO Company (CompanyID, Name) VALUES (?1, ?2)",
            params![1001, "Beta"],
        )
        .unwrap();
        assert_eq!(next_company_id(&conn).unwrap(), 1002);
    }

    #[test]
    fn db_path_respects_env_override() {
        let tmp = std::env::temp_dir().join("paintcontractor_db_path_test.db");
        std::env::set_var("PAINT_CONTRACTOR_DB_PATH", &tmp);
        let resolved = db_path();
        std::env::remove_var("PAINT_CONTRACTOR_DB_PATH");
        assert_eq!(resolved, tmp);
    }

    // Note: with_transaction unit tests are covered by the higher-level command integration
    // tests (job_catalog + csv_import) which exercise the real global DB path.
}
