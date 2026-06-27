package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/imns/tudo-backend/internal/model"
)

type MindMapRepo struct {
	pool *pgxpool.Pool
}

func NewMindMapRepo(pool *pgxpool.Pool) *MindMapRepo {
	return &MindMapRepo{pool: pool}
}

func (r *MindMapRepo) GetPositionsByTreeID(ctx context.Context, treeID string) ([]model.MindMapPosition, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT todo_id, tree_id, x, y, updated_at FROM mindmap_positions WHERE tree_id = $1`,
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
	_, err := r.pool.Exec(ctx,
		`INSERT INTO mindmap_positions (todo_id, tree_id, x, y) VALUES ($1, $2, $3, $4)
		 ON CONFLICT (todo_id) DO UPDATE SET x = $3, y = $4, updated_at = NOW()`,
		todoID, treeID, x, y,
	)
	return err
}

func (r *MindMapRepo) DeletePosition(ctx context.Context, todoID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM mindmap_positions WHERE todo_id = $1`, todoID)
	return err
}
