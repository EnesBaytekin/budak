package model

import (
	"database/sql/driver"
	"fmt"
	"strings"
	"time"
)

// Time is a time.Time wrapper that can scan SQLite's TEXT timestamps.
type Time struct {
	time.Time
}

// Scan implements sql.Scanner for reading SQLite TEXT into time.Time.
func (t *Time) Scan(src interface{}) error {
	if src == nil {
		t.Time = time.Time{}
		return nil
	}

	switch v := src.(type) {
	case time.Time:
		t.Time = v
		return nil
	case string:
		parsed, err := parseSQLiteTime(v)
		if err != nil {
			return err
		}
		t.Time = parsed
		return nil
	case []byte:
		parsed, err := parseSQLiteTime(string(v))
		if err != nil {
			return err
		}
		t.Time = parsed
		return nil
	default:
		return fmt.Errorf("unsupported type for Time: %T", src)
	}
}

// Value implements driver.Valuer.
func (t Time) Value() (driver.Value, error) {
	return t.Time.Format(time.RFC3339), nil
}

func parseSQLiteTime(s string) (time.Time, error) {
	// SQLite formats: "2026-07-05 09:00:56" or "2026-07-05T09:00:56"
	s = strings.Replace(s, "T", " ", 1)
	if strings.Contains(s, " ") {
		return time.Parse("2006-01-02 15:04:05", s)
	}
	return time.Parse(time.RFC3339, s)
}
