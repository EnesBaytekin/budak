package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/imns/tudo-backend/internal/model"
)

type TodoRepo struct {
	pool *pgxpool.Pool
}

func NewTodoRepo(pool *pgxpool.Pool) *TodoRepo {
	return &TodoRepo{pool: pool}
}

func scanTodo(row interface {
	Scan(dest ...interface{}) error
}) (model.Todo, error) {
	var t model.Todo
	var parentID *string
	err := row.Scan(&t.ID, &t.TreeID, &parentID, &t.Title, &t.Done, &t.Note, &t.SortOrder, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return t, err
	}
	t.ParentID = parentID
	t.Children = []*model.Todo{}
	return t, nil
}

// --- Trees ---

func (r *TodoRepo) CreateTree(ctx context.Context, userID string, title string) (*model.Tree, error) {
	var tr model.Tree
	err := r.pool.QueryRow(ctx,
		`INSERT INTO trees (user_id, title) VALUES ($1, $2)
		 RETURNING id, user_id, title, created_at, updated_at`,
		userID, title,
	).Scan(&tr.ID, &tr.UserID, &tr.Title, &tr.CreatedAt, &tr.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create tree: %w", err)
	}
	return &tr, nil
}

func (r *TodoRepo) GetTreesByUserID(ctx context.Context, userID string) ([]model.Tree, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, title, created_at, updated_at FROM trees WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("get trees: %w", err)
	}
	defer rows.Close()

	var trees []model.Tree
	for rows.Next() {
		var tr model.Tree
		if err := rows.Scan(&tr.ID, &tr.UserID, &tr.Title, &tr.CreatedAt, &tr.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan tree: %w", err)
		}
		trees = append(trees, tr)
	}
	return trees, nil
}

func (r *TodoRepo) GetTreeByID(ctx context.Context, treeID string) (*model.Tree, error) {
	var tr model.Tree
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, title, created_at, updated_at FROM trees WHERE id = $1`,
		treeID,
	).Scan(&tr.ID, &tr.UserID, &tr.Title, &tr.CreatedAt, &tr.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get tree: %w", err)
	}
	return &tr, nil
}

func (r *TodoRepo) UpdateTree(ctx context.Context, treeID string, title string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE trees SET title = $1, updated_at = NOW() WHERE id = $2`,
		title, treeID,
	)
	return err
}

func (r *TodoRepo) DeleteTree(ctx context.Context, treeID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM trees WHERE id = $1`, treeID)
	return err
}

// --- Todos ---

func (r *TodoRepo) CreateTodo(ctx context.Context, treeID string, parentID *string, title string, beforeID *string) (*model.Todo, error) {
	var sortOrder int
	effectiveParent := parentID

	if beforeID != nil {
		var targetSort int
		var targetParent *string
		err := r.pool.QueryRow(ctx,
			`SELECT sort_order, parent_id FROM todos WHERE id = $1`, *beforeID,
		).Scan(&targetSort, &targetParent)
		if err == nil {
			sortOrder = targetSort
			effectiveParent = targetParent
			r.pool.Exec(ctx,
				`UPDATE todos SET sort_order = sort_order + 1
				 WHERE tree_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND sort_order >= $3`,
				treeID, effectiveParent, sortOrder,
			)
		}
	} else {
		r.pool.QueryRow(ctx,
			`SELECT COALESCE(MAX(sort_order), -1) + 1 FROM todos
			 WHERE tree_id = $1 AND parent_id IS NOT DISTINCT FROM $2`,
			treeID, effectiveParent,
		).Scan(&sortOrder)
	}

	var t model.Todo
	err := r.pool.QueryRow(ctx,
		`INSERT INTO todos (tree_id, parent_id, title, sort_order) VALUES ($1, $2, $3, $4)
		 RETURNING id, tree_id, parent_id, title, done, note, sort_order, created_at, updated_at`,
		treeID, effectiveParent, title, sortOrder,
	).Scan(&t.ID, &t.TreeID, &t.ParentID, &t.Title, &t.Done, &t.Note, &t.SortOrder, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create todo: %w", err)
	}
	t.Children = []*model.Todo{}
	return &t, nil
}

func (r *TodoRepo) GetTodosByTreeID(ctx context.Context, treeID string) ([]model.Todo, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, tree_id, parent_id, title, done, note, sort_order, created_at, updated_at
		 FROM todos WHERE tree_id = $1 ORDER BY sort_order, created_at`,
		treeID,
	)
	if err != nil {
		return nil, fmt.Errorf("get todos: %w", err)
	}
	defer rows.Close()

	var todos []model.Todo
	for rows.Next() {
		t, err := scanTodo(rows)
		if err != nil {
			return nil, fmt.Errorf("scan todo: %w", err)
		}
		todos = append(todos, t)
	}
	return todos, nil
}

func (r *TodoRepo) GetTodoByID(ctx context.Context, todoID string) (*model.Todo, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT id, tree_id, parent_id, title, done, note, sort_order, created_at, updated_at
		 FROM todos WHERE id = $1`,
		todoID,
	)
	t, err := scanTodo(row)
	if err != nil {
		return nil, fmt.Errorf("get todo: %w", err)
	}
	return &t, nil
}

func (r *TodoRepo) UpdateTodo(ctx context.Context, todoID string, req model.UpdateTodoRequest) error {
	query := `UPDATE todos SET updated_at = NOW()`
	args := []interface{}{}
	argIdx := 1

	if req.Title != nil {
		query += fmt.Sprintf(", title = $%d", argIdx)
		args = append(args, *req.Title)
		argIdx++
	}
	if req.Done != nil {
		query += fmt.Sprintf(", done = $%d", argIdx)
		args = append(args, *req.Done)
		argIdx++
	}
	if req.Note != nil {
		query += fmt.Sprintf(", note = $%d", argIdx)
		args = append(args, *req.Note)
		argIdx++
	}
	if req.SortOrder != nil {
		query += fmt.Sprintf(", sort_order = $%d", argIdx)
		args = append(args, *req.SortOrder)
		argIdx++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argIdx)
	args = append(args, todoID)

	_, err := r.pool.Exec(ctx, query, args...)
	return err
}

func (r *TodoRepo) DeleteTodo(ctx context.Context, todoID string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM todos WHERE id = $1`, todoID)
	return err
}

func (r *TodoRepo) MoveTodo(ctx context.Context, todoID string, newParentID *string, sortOrder int) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE todos SET parent_id = $1, sort_order = $2, updated_at = NOW() WHERE id = $3`,
		newParentID, sortOrder, todoID,
	)
	return err
}

func (r *TodoRepo) MoveBefore(ctx context.Context, todoID, beforeID string) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Get target's parent_id and sort_order
	var targetParent *string
	var targetSort int
	err = tx.QueryRow(ctx,
		`SELECT parent_id, sort_order FROM todos WHERE id = $1`, beforeID,
	).Scan(&targetParent, &targetSort)
	if err != nil {
		return err
	}

	// Shift siblings forward
	_, err = tx.Exec(ctx,
		`UPDATE todos SET sort_order = sort_order + 1, updated_at = NOW()
		 WHERE id != $1 AND parent_id IS NOT DISTINCT FROM $2 AND sort_order >= $3`,
		todoID, targetParent, targetSort,
	)
	if err != nil {
		return err
	}

	// Move the todo before target
	_, err = tx.Exec(ctx,
		`UPDATE todos SET parent_id = $1, sort_order = $2, updated_at = NOW() WHERE id = $3`,
		targetParent, targetSort, todoID,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *TodoRepo) ReorderUp(ctx context.Context, todoID string) error {
	_, err := r.pool.Exec(ctx,
		`WITH sibling AS (
			SELECT id, sort_order FROM todos
			WHERE id != $1
			  AND parent_id IS NOT DISTINCT FROM (SELECT parent_id FROM todos WHERE id = $1)
			  AND sort_order < (SELECT sort_order FROM todos WHERE id = $1)
			ORDER BY sort_order DESC LIMIT 1
		)
		UPDATE todos
		SET sort_order = CASE
			WHEN id = $1 THEN (SELECT sort_order FROM sibling)
			ELSE (SELECT sort_order FROM todos WHERE id = $1)
		END,
		updated_at = NOW()
		WHERE id IN ($1, (SELECT id FROM sibling))`,
		todoID,
	)
	return err
}

func (r *TodoRepo) ReorderDown(ctx context.Context, todoID string) error {
	_, err := r.pool.Exec(ctx,
		`WITH sibling AS (
			SELECT id, sort_order FROM todos
			WHERE id != $1
			  AND parent_id IS NOT DISTINCT FROM (SELECT parent_id FROM todos WHERE id = $1)
			  AND sort_order > (SELECT sort_order FROM todos WHERE id = $1)
			ORDER BY sort_order ASC LIMIT 1
		)
		UPDATE todos
		SET sort_order = CASE
			WHEN id = $1 THEN (SELECT sort_order FROM sibling)
			ELSE (SELECT sort_order FROM todos WHERE id = $1)
		END,
		updated_at = NOW()
		WHERE id IN ($1, (SELECT id FROM sibling))`,
		todoID,
	)
	return err
}

// BuildTree builds a nested tree from a flat list of todos
func BuildTree(todos []model.Todo) []*model.Todo {
	if len(todos) == 0 {
		return []*model.Todo{}
	}

	nodeMap := make(map[string]*model.Todo)
	var roots []*model.Todo

	for i := range todos {
		todos[i].Children = []*model.Todo{}
		nodeMap[todos[i].ID] = &todos[i]
	}

	for i := range todos {
		node := nodeMap[todos[i].ID]
		if node.ParentID != nil {
			if parent, ok := nodeMap[*node.ParentID]; ok {
				parent.Children = append(parent.Children, node)
			} else {
				roots = append(roots, node)
			}
		} else {
			roots = append(roots, node)
		}
	}

	var sortChildren func(parent *model.Todo)
	sortChildren = func(parent *model.Todo) {
		for i := 0; i < len(parent.Children); i++ {
			for j := i + 1; j < len(parent.Children); j++ {
				if parent.Children[i].SortOrder > parent.Children[j].SortOrder {
					parent.Children[i], parent.Children[j] = parent.Children[j], parent.Children[i]
				}
			}
			sortChildren(parent.Children[i])
		}
	}

	for _, root := range roots {
		sortChildren(root)
	}

	return roots
}
