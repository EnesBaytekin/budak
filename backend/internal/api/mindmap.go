package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/enesbaytekin/budak/internal/model"
	"github.com/enesbaytekin/budak/internal/service"
)

type MindMapHandler struct {
	mindmapService *service.MindMapService
}

func NewMindMapHandler(mindmapService *service.MindMapService) *MindMapHandler {
	return &MindMapHandler{mindmapService: mindmapService}
}

func (h *MindMapHandler) GetPositions(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")

	positions, err := h.mindmapService.GetPositions(r.Context(), treeID)
	if err != nil {
		jsonError(w, "failed to get positions", http.StatusInternalServerError)
		return
	}
	if positions == nil {
		positions = []model.MindMapPosition{}
	}

	jsonResp(w, positions, http.StatusOK)
}

func (h *MindMapHandler) BatchUpsertPositions(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")

	var req model.BatchPositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.mindmapService.BatchUpsertPositions(r.Context(), treeID, req.Positions); err != nil {
		jsonError(w, "failed to save positions", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *MindMapHandler) UpsertPosition(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")

	var req struct {
		TreeID string  `json:"tree_id"`
		X      float64 `json:"x"`
		Y      float64 `json:"y"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.mindmapService.UpsertPosition(r.Context(), todoID, req.TreeID, req.X, req.Y); err != nil {
		jsonError(w, "failed to save position", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *MindMapHandler) DeletePosition(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")

	if err := h.mindmapService.DeletePosition(r.Context(), todoID); err != nil {
		jsonError(w, "failed to delete position", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}
