package service

import (
	"context"

	"github.com/imns/tudo-backend/internal/model"
	"github.com/imns/tudo-backend/internal/repository"
)

type MindMapService struct {
	mindmapRepo *repository.MindMapRepo
}

func NewMindMapService(mindmapRepo *repository.MindMapRepo) *MindMapService {
	return &MindMapService{mindmapRepo: mindmapRepo}
}

func (s *MindMapService) GetPositions(ctx context.Context, treeID string) ([]model.MindMapPosition, error) {
	return s.mindmapRepo.GetPositionsByTreeID(ctx, treeID)
}

func (s *MindMapService) UpsertPosition(ctx context.Context, todoID, treeID string, x, y float64) error {
	return s.mindmapRepo.UpsertPosition(ctx, todoID, treeID, x, y)
}

func (s *MindMapService) BatchUpsertPositions(ctx context.Context, treeID string, positions []model.PositionInput) error {
	for _, p := range positions {
		if err := s.mindmapRepo.UpsertPosition(ctx, p.TodoID, treeID, p.X, p.Y); err != nil {
			return err
		}
	}
	return nil
}

func (s *MindMapService) DeletePosition(ctx context.Context, todoID string) error {
	return s.mindmapRepo.DeletePosition(ctx, todoID)
}
