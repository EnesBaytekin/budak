package service

import (
	"context"
	"database/sql"
	"encoding/json"
)

type PrefsService struct {
	db *sql.DB
}

func NewPrefsService(db *sql.DB) *PrefsService {
	return &PrefsService{db: db}
}

func (s *PrefsService) Get(ctx context.Context, userID string) (map[string]interface{}, error) {
	var raw string
	err := s.db.QueryRowContext(ctx,
		`SELECT prefs FROM user_prefs WHERE user_id = ?`, userID,
	).Scan(&raw)
	if err != nil {
		return map[string]interface{}{}, err
	}
	var prefs map[string]interface{}
	json.Unmarshal([]byte(raw), &prefs)
	return prefs, nil
}

func (s *PrefsService) Save(ctx context.Context, userID string, prefs map[string]interface{}) error {
	data, _ := json.Marshal(prefs)
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO user_prefs (user_id, prefs) VALUES (?, ?)
		 ON CONFLICT (user_id) DO UPDATE SET prefs = excluded.prefs, updated_at = datetime('now')`,
		userID, string(data),
	)
	return err
}
