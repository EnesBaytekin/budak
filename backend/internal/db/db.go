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
	`

	if _, err := db.ExecContext(ctx, schema); err != nil {
		return fmt.Errorf("auto-migrate: %w", err)
	}

	return nil
}
