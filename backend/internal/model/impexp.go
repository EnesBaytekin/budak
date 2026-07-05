package model

type ImportRequest struct {
	Content string `json:"content"`
	Format  string `json:"format,omitempty"` // auto, plain, markdown, yaml
	Mode    string `json:"mode,omitempty"`   // replace, merge
}

type ExportRequest struct {
	Format string `json:"format"` // plain, markdown, yaml, opml
}
