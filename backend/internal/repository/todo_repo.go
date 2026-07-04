package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/enesbaytekin/budak/internal/model"
	"github.com/google/uuid"
)

type TodoRepo struct {
	db *sql.DB
}

func NewTodoRepo(db *sql.DB) *TodoRepo {
	return &TodoRepo{db: db}
}

func scanTodo(scanner interface{ Scan(dest ...interface{}) error }) (model.Todo, error) {
	var t model.Todo
	var parentID sql.NullString
	err := scanner.Scan(&t.ID, &t.TreeID, &parentID, &t.Title, &t.Done, &t.Note, &t.SortOrder,
		&t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return t, err
	}
	if parentID.Valid {
		t.ParentID = &parentID.String
	}
	t.Children = []*model.Todo{}
	return t, nil
}

// --- Trees ---

func (r *TodoRepo) CreateTree(ctx context.Context, userID string, title string) (*model.Tree, error) {
	id := uuid.New().String()
	var tr model.Tree
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO trees (id, user_id, title) VALUES (?, ?, ?)
		 RETURNING id, user_id, title, created_at, updated_at`,
		id, userID, title,
	).Scan(&tr.ID, &tr.UserID, &tr.Title, &tr.CreatedAt, &tr.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create tree: %w", err)
	}
	return &tr, nil
}

func (r *TodoRepo) GetTreesByUserID(ctx context.Context, userID string) ([]model.Tree, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, user_id, title, created_at, updated_at FROM trees WHERE user_id = ? ORDER BY created_at DESC`,
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
	err := r.db.QueryRowContext(ctx,
		`SELECT id, user_id, title, created_at, updated_at FROM trees WHERE id = ?`,
		treeID,
	).Scan(&tr.ID, &tr.UserID, &tr.Title, &tr.CreatedAt, &tr.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("get tree: %w", err)
	}
	return &tr, nil
}

func (r *TodoRepo) UpdateTree(ctx context.Context, treeID string, title string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE trees SET title = ?, updated_at = datetime('now') WHERE id = ?`,
		title, treeID,
	)
	return err
}

func (r *TodoRepo) DeleteTree(ctx context.Context, treeID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM trees WHERE id = ?`, treeID)
	return err
}

// --- Todos ---

func (r *TodoRepo) CreateTodo(ctx context.Context, treeID string, parentID *string, title string, beforeID *string) (*model.Todo, error) {
	id := uuid.New().String()
	var sortOrder int
	effectiveParent := parentID

	if beforeID != nil {
		var targetSort int
		var targetParent sql.NullString
		err := r.db.QueryRowContext(ctx,
			`SELECT sort_order, parent_id FROM todos WHERE id = ?`, *beforeID,
		).Scan(&targetSort, &targetParent)
		if err == nil {
			sortOrder = targetSort
			if targetParent.Valid {
				effectiveParent = &targetParent.String
			} else {
				effectiveParent = nil
			}
			_, _ = r.db.ExecContext(ctx,
				`UPDATE todos SET sort_order = sort_order + 1
				 WHERE tree_id = ? AND sort_order >= ?
				   AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))`,
				treeID, sortOrder, effectiveParent, effectiveParent,
			)
		}
	} else {
		r.db.QueryRowContext(ctx,
			`SELECT COALESCE(MAX(sort_order), -1) + 1 FROM todos
			 WHERE tree_id = ? AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))`,
			treeID, effectiveParent, effectiveParent,
		).Scan(&sortOrder)
	}

	var t model.Todo
	err := r.db.QueryRowContext(ctx,
		`INSERT INTO todos (id, tree_id, parent_id, title, sort_order) VALUES (?, ?, ?, ?, ?)
		 RETURNING id, tree_id, parent_id, title, done, note, sort_order, created_at, updated_at`,
		id, treeID, effectiveParent, title, sortOrder,
	).Scan(&t.ID, &t.TreeID, &t.ParentID, &t.Title, &t.Done, &t.Note, &t.SortOrder, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("create todo: %w", err)
	}
	t.Children = []*model.Todo{}
	return &t, nil
}

func (r *TodoRepo) GetTodosByTreeID(ctx context.Context, treeID string) ([]model.Todo, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, tree_id, parent_id, title, done, note, sort_order, created_at, updated_at
		 FROM todos WHERE tree_id = ? ORDER BY sort_order, created_at`,
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
	row := r.db.QueryRowContext(ctx,
		`SELECT id, tree_id, parent_id, title, done, note, sort_order, created_at, updated_at
		 FROM todos WHERE id = ?`,
		todoID,
	)
	t, err := scanTodo(row)
	if err != nil {
		return nil, fmt.Errorf("get todo: %w", err)
	}
	return &t, nil
}

func (r *TodoRepo) UpdateTodo(ctx context.Context, todoID string, req model.UpdateTodoRequest) error {
	query := `UPDATE todos SET updated_at = datetime('now')`
	args := []interface{}{}

	if req.Title != nil {
		query += ", title = ?"
		args = append(args, *req.Title)
	}
	if req.Done != nil {
		query += ", done = ?"
		args = append(args, *req.Done)
	}
	if req.Note != nil {
		query += ", note = ?"
		args = append(args, *req.Note)
	}
	if req.SortOrder != nil {
		query += ", sort_order = ?"
		args = append(args, *req.SortOrder)
	}

	query += " WHERE id = ?"
	args = append(args, todoID)

	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

func (r *TodoRepo) DeleteTodo(ctx context.Context, todoID string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM todos WHERE id = ?`, todoID)
	return err
}

func (r *TodoRepo) MoveTodo(ctx context.Context, todoID string, newParentID *string, sortOrder int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE todos SET parent_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
		newParentID, sortOrder, todoID,
	)
	return err
}

func (r *TodoRepo) MoveBefore(ctx context.Context, todoID, beforeID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var targetParent sql.NullString
	var targetSort int
	err = tx.QueryRowContext(ctx,
		`SELECT parent_id, sort_order FROM todos WHERE id = ?`, beforeID,
	).Scan(&targetParent, &targetSort)
	if err != nil {
		return err
	}

	var tp *string
	if targetParent.Valid {
		tp = &targetParent.String
	}

	// Shift siblings forward
	_, err = tx.ExecContext(ctx,
		`UPDATE todos SET sort_order = sort_order + 1, updated_at = datetime('now')
		 WHERE id != ? AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL)) AND sort_order >= ?`,
		todoID, tp, tp, targetSort,
	)
	if err != nil {
		return err
	}

	// Move the todo before target
	_, err = tx.ExecContext(ctx,
		`UPDATE todos SET parent_id = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
		tp, targetSort, todoID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (r *TodoRepo) ReorderUp(ctx context.Context, todoID string) error {
	return r.swapSiblingSort(ctx, todoID, "DESC", "<")
}

func (r *TodoRepo) ReorderDown(ctx context.Context, todoID string) error {
	return r.swapSiblingSort(ctx, todoID, "ASC", ">")
}

func (r *TodoRepo) swapSiblingSort(ctx context.Context, todoID string, orderDir, cmp string) error {
	// Get current sort_order and parent_id
	var curSort int
	var parentID sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT sort_order, parent_id FROM todos WHERE id = ?`, todoID,
	).Scan(&curSort, &parentID)
	if err != nil {
		return fmt.Errorf("get todo sort: %w", err)
	}

	var tp *string
	if parentID.Valid {
		tp = &parentID.String
	}

	// Find the sibling to swap with
	var siblingID string
	var siblingSort int
	err = r.db.QueryRowContext(ctx,
		`SELECT id, sort_order FROM todos
		 WHERE id != ?
		   AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
		   AND sort_order `+cmp+` ?
		 ORDER BY sort_order `+orderDir+` LIMIT 1`,
		todoID, tp, tp, curSort,
	).Scan(&siblingID, &siblingSort)
	if err != nil {
		return nil // no sibling to swap with, not an error
	}

	// Swap via transaction
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		`UPDATE todos SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
		siblingSort, todoID,
	); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE todos SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
		curSort, siblingID,
	); err != nil {
		return err
	}

	return tx.Commit()
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
