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

// PreviewImport handles POST /api/v1/trees/{treeID}/import/preview
func (h *ImpExpHandler) PreviewImport(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Content string             `json:"content"`
		Format  string             `json:"format,omitempty"`
		Config  model.FormatConfig `json:"config,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Content == "" {
		jsonError(w, "content is required", http.StatusBadRequest)
		return
	}

	preview, err := h.impSvc.PreviewImport(req.Content, req.Format, req.Config)
	if err != nil {
		jsonError(w, "preview failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	jsonResp(w, preview, http.StatusOK)
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

// Export handles GET /api/v1/trees/{treeID}/export
func (h *ImpExpHandler) Export(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")
	format := r.URL.Query().Get("format")
	if format == "" {
		format = "markdown"
	}

	// Parse custom config from query params
	cfg := model.FormatConfig{
		DonePrefix:   r.URL.Query().Get("done_prefix"),
		UndonePrefix: r.URL.Query().Get("undone_prefix"),
		Indent:       r.URL.Query().Get("indent"),
		Bullet:       r.URL.Query().Get("bullet"),
	}

	var content string
	var err error
	if cfg.DonePrefix != "" || cfg.UndonePrefix != "" || cfg.Indent != "" || cfg.Bullet != "" {
		content, err = h.impSvc.ExportTree(r.Context(), treeID, format, cfg)
	} else {
		content, err = h.impSvc.ExportTree(r.Context(), treeID, format)
	}
	if err != nil {
		jsonError(w, "export failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(content))
}

// PreviewExport handles POST /api/v1/trees/{treeID}/export/preview
func (h *ImpExpHandler) PreviewExport(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")

	var req model.ExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Format == "" {
		req.Format = "markdown"
	}

	var content string
	var err error
	if req.Config.DonePrefix != "" || req.Config.UndonePrefix != "" || req.Config.Indent != "" || req.Config.Bullet != "" {
		content, err = h.impSvc.ExportTree(r.Context(), treeID, req.Format, req.Config)
	} else {
		content, err = h.impSvc.ExportTree(r.Context(), treeID, req.Format)
	}
	if err != nil {
		jsonError(w, "export preview failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]string{"content": content}, http.StatusOK)
}
