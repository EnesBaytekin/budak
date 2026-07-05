package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/enesbaytekin/budak/internal/model"
	"github.com/enesbaytekin/budak/internal/service"
)

type ImpExpHandler struct {
	impSvc *service.ImportService
}

func NewImpExpHandler(impSvc *service.ImportService) *ImpExpHandler {
	return &ImpExpHandler{impSvc: impSvc}
}

// Import handles POST /api/v1/trees/{treeID}/import
func (h *ImpExpHandler) Import(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")

	var req model.ImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		jsonError(w, "content is required", http.StatusBadRequest)
		return
	}

	count, err := h.impSvc.Import(r.Context(), treeID, req)
	if err != nil {
		jsonError(w, "import failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	jsonResp(w, map[string]interface{}{
		"imported": count,
	}, http.StatusCreated)
}

// Export handles GET /api/v1/trees/{treeID}/export?format=markdown
func (h *ImpExpHandler) Export(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "markdown"
	}

	content, err := h.impSvc.ExportTree(r.Context(), treeID, format)
	if err != nil {
		jsonError(w, "export failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(content))
}
