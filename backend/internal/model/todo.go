package model

import "time"

type Tree struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Todo struct {
	ID        string    `json:"id"`
	TreeID    string    `json:"tree_id"`
	ParentID  *string   `json:"parent_id"`
	Path      string    `json:"path"`
	Title     string    `json:"title"`
	Done      bool      `json:"done"`
	Note      string    `json:"note"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Children  []*Todo   `json:"children"`
}

type CreateTreeRequest struct {
	Title string `json:"title"`
}

type UpdateTreeRequest struct {
	Title string `json:"title"`
}

type CreateTodoRequest struct {
	ParentID *string `json:"parent_id"`
	Title    string  `json:"title"`
}

type UpdateTodoRequest struct {
	Title     *string `json:"title,omitempty"`
	Done      *bool   `json:"done,omitempty"`
	Note      *string `json:"note,omitempty"`
	SortOrder *int    `json:"sort_order,omitempty"`
}

type MoveTodoRequest struct {
	NewParentID *string `json:"new_parent_id"`
	SortOrder   int     `json:"sort_order"`
}
