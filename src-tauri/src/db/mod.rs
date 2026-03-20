use std::path::Path;
use rusqlite::Connection;
use anyhow::Result;

pub fn init(db_path: &Path) -> Result<Connection> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let conn = Connection::open(db_path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS profiles (
            id                    TEXT PRIMARY KEY,
            name                  TEXT NOT NULL,
            source                TEXT NOT NULL DEFAULT 'local',
            file_path             TEXT NOT NULL,
            sub_url               TEXT,
            updated_at            TEXT NOT NULL,
            is_active             INTEGER NOT NULL DEFAULT 0,
            auto_update           INTEGER NOT NULL DEFAULT 0,
            auto_update_interval  INTEGER NOT NULL DEFAULT 480
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )?;

    add_column_if_missing(conn, "profiles", "auto_update", "INTEGER NOT NULL DEFAULT 0")?;
    add_column_if_missing(conn, "profiles", "auto_update_interval", "INTEGER NOT NULL DEFAULT 480")?;

    Ok(())
}

fn add_column_if_missing(conn: &Connection, table: &str, column: &str, col_type: &str) -> Result<()> {
    let sql = format!("SELECT COUNT(*) FROM pragma_table_info('{}') WHERE name='{}'", table, column);
    let count: i32 = conn.query_row(&sql, [], |row| row.get(0))?;
    if count == 0 {
        conn.execute_batch(&format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, col_type))?;
        log::info!("Added column {}.{}", table, column);
    }
    Ok(())
}
