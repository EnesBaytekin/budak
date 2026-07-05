package service

import (
	"context"
	"fmt"

	"github.com/enesbaytekin/budak/internal/model"
	"github.com/enesbaytekin/budak/internal/repository"
)

type ImportService struct {
	todoRepo *repository.TodoRepo
}

func NewImportService(todoRepo *repository.TodoRepo) *ImportService {
	return &ImportService{todoRepo: todoRepo}
}

// Import parses content and creates todos in the given tree.
// It returns the number of todos created.
func (s *ImportService) Import(ctx context.Context, treeID string, req model.ImportRequest) (int, error) {
	parsed, err := parseImport(req.Content, req.Format)
	if err != nil {
		return 0, fmt.Errorf("parse error: %w", err)
	}
	if len(parsed) == 0 {
		return 0, nil
	}

	// Build a map from parsed index to actual todo ID
	realIDs := make(map[int]string) // parsed index → real todo ID

	for i, pt := range parsed {
		var parentID *string
		if pt.ParentIdx >= 0 {
			if id, ok := realIDs[pt.ParentIdx]; ok {
				parentID = &id
			}
		}

		todo, err := s.todoRepo.CreateTodo(ctx, treeID, parentID, pt.Title, nil)
		if err != nil {
			return i, fmt.Errorf("create todo at line %d: %w", i+1, err)
		}

		// If done, update it
		if pt.Done {
			done := true
			if err := s.todoRepo.UpdateTodo(ctx, todo.ID, model.UpdateTodoRequest{Done: &done}); err != nil {
				return i + 1, fmt.Errorf("update todo status: %w", err)
			}
		}

		realIDs[i] = todo.ID
	}

	return len(parsed), nil
}

// ExportTree fetches all todos for a tree, builds the tree, and exports in the requested format.
func (s *ImportService) ExportTree(ctx context.Context, treeID, format string) (string, error) {
	todos, err := s.todoRepo.GetTodosByTreeID(ctx, treeID)
	if err != nil {
		return "", fmt.Errorf("get todos: %w", err)
	}

	roots := repository.BuildTree(todos)
	if len(roots) == 0 {
		return "", nil
	}

	content, err := Export(roots, format)
	if err != nil {
		return "", fmt.Errorf("export: %w", err)
	}

	return content, nil
}
