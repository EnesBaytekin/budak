package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	_ "modernc.org/sqlite"
)

func Connect(ctx context.Context) (*sql.DB, error) {
	path := os.Getenv("DB_PATH")
	if path == "" {
		path = "budak.db"
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}

	// WAL mode for better concurrency (reads don't block writes)
	if _, err := db.ExecContext(ctx, "PRAGMA journal_mode=WAL"); err != nil {
		return nil, fmt.Errorf("set WAL mode: %w", err)
	}

	// Busy timeout — wait up to 5s instead of failing immediately
	if _, err := db.ExecContext(ctx, "PRAGMA busy_timeout=5000"); err != nil {
		return nil, fmt.Errorf("set busy timeout: %w", err)
	}

	// Foreign keys ON (off by default in SQLite)
	if _, err := db.ExecContext(ctx, "PRAGMA foreign_keys=ON"); err != nil {
		return nil, fmt.Errorf("enable foreign keys: %w", err)
	}

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return db, nil
}

// AutoMigrate creates tables if they don't exist.
func AutoMigrate(ctx context.Context, db *sql.DB) error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id          TEXT PRIMARY KEY,
		username    TEXT UNIQUE NOT NULL,
		email       TEXT NOT NULL DEFAULT '',
		password    TEXT NOT NULL,
		created_at  TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS trees (
		id          TEXT PRIMARY KEY,
		user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		title       TEXT NOT NULL DEFAULT 'Untitled Tree',
		sort_order  INTEGER NOT NULL DEFAULT 0,
		created_at  TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE TABLE IF NOT EXISTS todos (
		id          TEXT PRIMARY KEY,
		tree_id     TEXT NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
		parent_id   TEXT REFERENCES todos(id) ON DELETE CASCADE,
		title       TEXT NOT NULL DEFAULT '',
		done        INTEGER NOT NULL DEFAULT 0,
		note        TEXT NOT NULL DEFAULT '',
		sort_order  INTEGER NOT NULL DEFAULT 0,
		created_at  TEXT NOT NULL DEFAULT (datetime('now')),
		updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE INDEX IF NOT EXISTS idx_todos_tree_id ON todos(tree_id);
	CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);

	CREATE TABLE IF NOT EXISTS mindmap_positions (
		todo_id     TEXT PRIMARY KEY REFERENCES todos(id) ON DELETE CASCADE,
		tree_id     TEXT NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
		x           REAL NOT NULL DEFAULT 0,
		y           REAL NOT NULL DEFAULT 0,
		updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
	);

	CREATE INDEX IF NOT EXISTS idx_mindmap_positions_tree_id ON mindmap_positions(tree_id);

		CREATE TABLE IF NOT EXISTS user_prefs (
			user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			prefs       TEXT NOT NULL DEFAULT '{}',
			updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`

	if _, err := db.ExecContext(ctx, schema); err != nil {
		return fmt.Errorf("auto-migrate: %w", err)
	}

	if err := migrateTreeSortOrder(ctx, db); err != nil {
		return fmt.Errorf("migrate tree sort_order: %w", err)
	}

	return nil
}

// migrateTreeSortOrder adds the sort_order column to existing trees tables and
// backfills it so the current display order (newest first) is preserved.
func migrateTreeSortOrder(ctx context.Context, db *sql.DB) error {
	hasColumn := false
	rows, err := db.QueryContext(ctx, "PRAGMA table_info(trees)")
	if err != nil {
		return err
	}
	for rows.Next() {
		var cid, notnull, pk int
		var name, ctype string
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			rows.Close()
			return err
		}
		if name == "sort_order" {
			hasColumn = true
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	if hasColumn {
		return nil
	}

	if _, err := db.ExecContext(ctx, `ALTER TABLE trees ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`); err != nil {
		return err
	}

	// Backfill: assign descending sort_order following the current order
	// (created_at DESC, newest first) so the existing layout is unchanged.
	ids, err := db.QueryContext(ctx, `SELECT id FROM trees ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return err
	}
	var order []string
	for ids.Next() {
		var id string
		if err := ids.Scan(&id); err != nil {
			ids.Close()
			return err
		}
		order = append(order, id)
	}
	ids.Close()
	if err := ids.Err(); err != nil {
		return err
	}

	for i, id := range order {
		if _, err := db.ExecContext(ctx,
			`UPDATE trees SET sort_order = ? WHERE id = ?`, len(order)-i, id,
		); err != nil {
			return err
		}
	}
	return nil
}
