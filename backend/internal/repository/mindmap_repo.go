package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/enesbaytekin/budak/internal/model"
)

type MindMapRepo struct {
	db *sql.DB
}

func NewMindMapRepo(db *sql.DB) *MindMapRepo {
	return &MindMapRepo{db: db}
}

func (r *MindMapRepo) GetPositionsByTreeID(ctx context.Context, treeID string) ([]model.MindMapPosition, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT todo_id, tree_id, x, y, updated_at FROM mindmap_positions WHERE tree_id = ?`,
		treeID,
	)
	if err != nil {
		return nil, fmt.Errorf("get positions: %w", err)
	}
	defer rows.Close()

	var positions []model.MindMapPosition
	for rows.Next() {
		var p model.MindMapPosition
		if err := rows.Scan(&p.TodoID, &p.TreeID, &p.X, &p.Y, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan position: %w", err)
		}
		positions = append(positions, p)
	}
	return positions, nil
}

func (r *MindMapRepo) UpsertPosition(ctx context.Context, todoID, treeID string, x, y float64) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO mindmap_positions (todo_id, tree_id, x, y) VALUES (?, ?, ?, ?)
		 ON CONFLICT (todo_id) DO UPDATE SET x = excluded.x, y = excluded.y, updated_at = datetime('now')`,
		todoID, treeID, x, y,
	)
	return err
}

func (r *MindMapRepo) DeletePosition(ctx context.Context, todoID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM mindmap_positions WHERE todo_id = ?`, todoID)
	return err
}
