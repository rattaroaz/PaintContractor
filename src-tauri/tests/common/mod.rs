//! Shared test fixtures for Rust integration tests.
//!
//! Every test points the global SQLite connection at a fresh tempdir DB via
//! the `PAINT_CONTRACTOR_DB_PATH` env var, then calls `db::init_db()`. Tests
//! must run serially (see `serial_test`) because the underlying connection
//! lives in a static `Mutex<Option<Connection>>`.

pub mod fixtures;

use paint_contractor_lib::db;
use std::path::PathBuf;
use tempfile::TempDir;

pub struct TestDb {
    #[allow(dead_code)]
    pub dir: TempDir,
    #[allow(dead_code)]
    pub path: PathBuf,
}

impl TestDb {
    pub fn new() -> Self {
        let dir = tempfile::tempdir().expect("create tempdir");
        let path = dir.path().join("app.db");
        std::env::set_var("PAINT_CONTRACTOR_DB_PATH", &path);
        db::reset_for_tests();
        db::init_db().expect("init_db");
        TestDb { dir, path }
    }
}

impl Drop for TestDb {
    fn drop(&mut self) {
        db::reset_for_tests();
        std::env::remove_var("PAINT_CONTRACTOR_DB_PATH");
    }
}
