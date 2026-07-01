package api

import (
	"encoding/json"
	"net/http"

	"github.com/enesbaytekin/budak/internal/model"
	"github.com/enesbaytekin/budak/internal/service"
)

type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" {
		jsonError(w, "username, email, and password are required", http.StatusBadRequest)
		return
	}

	resp, err := h.authService.Register(r.Context(), req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}

	jsonResp(w, resp, http.StatusCreated)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Username == "" || req.Password == "" {
		jsonError(w, "username and password are required", http.StatusBadRequest)
		return
	}

	resp, err := h.authService.Login(r.Context(), req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	jsonResp(w, resp, http.StatusOK)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.authService.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		jsonError(w, err.Error(), http.StatusUnauthorized)
		return
	}

	jsonResp(w, resp, http.StatusOK)
}

func (h *AuthHandler) Status(w http.ResponseWriter, r *http.Request) {
	jsonResp(w, map[string]interface{}{
		"authenticated":     true,
		"user_id":           GetUserID(r),
		"username":          GetUsername(r),
		"registration_open": h.authService.IsRegistrationOpen(),
	}, http.StatusOK)
}
