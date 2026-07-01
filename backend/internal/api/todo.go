package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/imns/tudo-backend/internal/model"
	"github.com/imns/tudo-backend/internal/repository"
)

type TodoHandler struct {
	todoRepo *repository.TodoRepo
}

func NewTodoHandler(todoRepo *repository.TodoRepo) *TodoHandler {
	return &TodoHandler{todoRepo: todoRepo}
}

func (h *TodoHandler) List(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")
	todos, err := h.todoRepo.GetTodosByTreeID(r.Context(), treeID)
	if err != nil {
		jsonError(w, "failed to get todos", http.StatusInternalServerError)
		return
	}
	tree := repository.BuildTree(todos)
	jsonResp(w, tree, http.StatusOK)
}

func (h *TodoHandler) Create(w http.ResponseWriter, r *http.Request) {
	treeID := chi.URLParam(r, "treeID")
	var req model.CreateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	todo, err := h.todoRepo.CreateTodo(r.Context(), treeID, req.ParentID, req.Title, req.BeforeID)
	if err != nil {
		jsonError(w, "failed to create todo", http.StatusInternalServerError)
		return
	}
	jsonResp(w, todo, http.StatusCreated)
}

func (h *TodoHandler) Update(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")
	var req model.UpdateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := h.todoRepo.UpdateTodo(r.Context(), todoID, req); err != nil {
		jsonError(w, "failed to update todo", http.StatusInternalServerError)
		return
	}
	todo, err := h.todoRepo.GetTodoByID(r.Context(), todoID)
	if err != nil {
		jsonError(w, "todo not found", http.StatusNotFound)
		return
	}
	jsonResp(w, todo, http.StatusOK)
}

func (h *TodoHandler) Delete(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")
	if err := h.todoRepo.DeleteTodo(r.Context(), todoID); err != nil {
		jsonError(w, "failed to delete todo", http.StatusInternalServerError)
		return
	}
	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *TodoHandler) Move(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")
	var req model.MoveTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := h.todoRepo.MoveTodo(r.Context(), todoID, req.NewParentID, req.SortOrder); err != nil {
		jsonError(w, "failed to move todo", http.StatusInternalServerError)
		return
	}
	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *TodoHandler) MoveBefore(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")
	var req struct {
		BeforeID string `json:"before_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if err := h.todoRepo.MoveBefore(r.Context(), todoID, req.BeforeID); err != nil {
		jsonError(w, "failed to move: "+err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *TodoHandler) ReorderUp(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")
	if err := h.todoRepo.ReorderUp(r.Context(), todoID); err != nil {
		jsonError(w, "failed to reorder: "+err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}

func (h *TodoHandler) ReorderDown(w http.ResponseWriter, r *http.Request) {
	todoID := chi.URLParam(r, "todoID")
	if err := h.todoRepo.ReorderDown(r.Context(), todoID); err != nil {
		jsonError(w, "failed to reorder: "+err.Error(), http.StatusInternalServerError)
		return
	}
	jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
}
