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

// PreviewImport parses content and returns a preview without saving.
func (s *ImportService) PreviewImport(content, format string, cfg ...model.FormatConfig) (model.PreviewResponse, error) {
	parsed, err := parseImport(content, format, cfg...)
	if err != nil {
		return model.PreviewResponse{}, fmt.Errorf("parse error: %w", err)
	}

	items := make([]model.ParseResultItem, len(parsed))
	for i, p := range parsed {
		items[i] = model.ParseResultItem{
			Title: p.Title,
			Done:  p.Done,
			Depth: p.Depth,
		}
	}

	return model.PreviewResponse{Items: items, Total: len(items)}, nil
}

// Import parses content and creates todos in the given tree.
func (s *ImportService) Import(ctx context.Context, treeID string, req model.ImportRequest) (int, error) {
	parsed, err := parseImport(req.Content, req.Format, req.Config)
	if err != nil {
		return 0, fmt.Errorf("parse error: %w", err)
	}
	if len(parsed) == 0 {
		return 0, nil
	}

	realIDs := make(map[int]string)

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

// ExportTree fetches all todos, builds tree, exports in requested format.
func (s *ImportService) ExportTree(ctx context.Context, treeID, format string, cfg ...model.FormatConfig) (string, error) {
	todos, err := s.todoRepo.GetTodosByTreeID(ctx, treeID)
	if err != nil {
		return "", fmt.Errorf("get todos: %w", err)
	}

	roots := repository.BuildTree(todos)
	if len(roots) == 0 {
		return "", nil
	}

	content, err := Export(roots, format, cfg...)
	if err != nil {
		return "", fmt.Errorf("export: %w", err)
	}

	return content, nil
}
