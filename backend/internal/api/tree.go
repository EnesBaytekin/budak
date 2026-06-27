package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/imns/tudo-backend/internal/model"
	"github.com/imns/tudo-backend/internal/repository"
)

type TreeHandler struct {
	todoRepo *repository.TodoRepo
}

func NewTreeHandler(todoRepo *repository.TodoRepo) *TreeHandler {
	return &TreeHandler{todoRepo: todoRepo}
}

func (h *TreeHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	trees, err := h.todoRepo.GetTreesByUserID(r.Context(), userID)
	if err != nil {
		jsonError(w, "failed to list trees", http.StatusInternalServerError)
		return
	}
	if trees == nil {
		trees = []model.Tree{}
	}
	jsonResp(w, trees, http.StatusOK)
}

func (h *TreeHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	var req model.CreateTreeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		req.Title = "Untitled Tree"
	}

	tree, err := h.todoRepo.CreateTree(r.Context(), userID, req.Title)
	if err != nil {
		jsonError(w, "failed to create tree", http.StatusInternalServerError)
		return
	}

	jsonResp(w, tree, http.StatusCreated)
}

func (h *TreeHandler) Get(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")
	userID := GetUserID(r)

	tree, err := h.todoRepo.GetTreeByID(r.Context(), treeID)
	if err != nil {
		jsonError(w, "tree not found", http.StatusNotFound)
		return
	}
	if tree.UserID != userID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	todos, err := h.todoRepo.GetTodosByTreeID(r.Context(), treeID)
	if err != nil {
		jsonError(w, "failed to get todos", http.StatusInternalServerError)
		return
	}

	treeResponse := map[string]interface{}{
		"tree":  tree,
		"todos": repository.BuildTree(todos),
	}

	jsonResp(w, treeResponse, http.StatusOK)
}

func (h *TreeHandler) Update(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")
	userID := GetUserID(r)

	tree, err := h.todoRepo.GetTreeByID(r.Context(), treeID)
	if err != nil {
		jsonError(w, "tree not found", http.StatusNotFound)
		return
	}
	if tree.UserID != userID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	var req model.UpdateTreeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.todoRepo.UpdateTree(r.Context(), treeID, req.Title); err != nil {
		jsonError(w, "failed to update tree", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *TreeHandler) Delete(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")
	userID := GetUserID(r)

	tree, err := h.todoRepo.GetTreeByID(r.Context(), treeID)
	if err != nil {
		jsonError(w, "tree not found", http.StatusNotFound)
		return
	}
	if tree.UserID != userID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.todoRepo.DeleteTree(r.Context(), treeID); err != nil {
		jsonError(w, "failed to delete tree", http.StatusInternalServerError)
		return
	}

	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}
