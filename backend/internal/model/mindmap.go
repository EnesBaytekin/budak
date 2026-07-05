package model

type MindMapPosition struct {
	TodoID    string  `json:"todo_id"`
	TreeID    string  `json:"tree_id"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	UpdatedAt Time    `json:"updated_at"`
}

type BatchPositionRequest struct {
	Positions []PositionInput `json:"positions"`
}

type PositionInput struct {
	TodoID string  `json:"todo_id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
}
