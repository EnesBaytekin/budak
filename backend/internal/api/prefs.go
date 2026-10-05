package api

import (
	"encoding/json"
	"net/http"

	"github.com/enesbaytekin/budak/internal/service"
)

type PrefsHandler struct {
	svc *service.PrefsService
}

func NewPrefsHandler(svc *service.PrefsService) *PrefsHandler {
	return &PrefsHandler{svc: svc}
}

func (h *PrefsHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	prefs, err := h.svc.Get(r.Context(), userID)
	if err != nil {
		jsonResp(w, map[string]interface{}{}, http.StatusOK)
		return
	}
	jsonResp(w, prefs, http.StatusOK)
}

func (h *PrefsHandler) Save(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	var prefs map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&prefs); err != nil {
		jsonError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if err := h.svc.Save(r.Context(), userID, prefs); err != nil {
		jsonError(w, "save failed", http.StatusInternalServerError)
		return
	}
	jsonResp(w, prefs, http.StatusOK)
}
