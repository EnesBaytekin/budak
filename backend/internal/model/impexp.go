package model

type FormatConfig struct {
	DonePrefix   string `json:"done_prefix,omitempty"`   // default "[x]"
	UndonePrefix string `json:"undone_prefix,omitempty"` // default "[ ]"
	Indent       string `json:"indent,omitempty"`        // default "  "
	Bullet       string `json:"bullet,omitempty"`        // default "- " (markdown) or "" (plain)
	EOL          string `json:"eol,omitempty"`           // default "\n"
}

func (c FormatConfig) WithDefaults() FormatConfig {
	if c.Indent == "" {
		c.Indent = "  "
	}
	if c.DonePrefix == "" {
		c.DonePrefix = "[x]"
	}
	if c.UndonePrefix == "" {
		c.UndonePrefix = "[ ]"
	}
	if c.Bullet == "" {
		c.Bullet = "- "
	}
	if c.EOL == "" {
		c.EOL = "\n"
	}
	return c
}

type ImportRequest struct {
	Content string      `json:"content"`
	Format  string      `json:"format,omitempty"` // auto, plain, markdown, custom
	Config  FormatConfig `json:"config,omitempty"`
}

type ExportRequest struct {
	Format string      `json:"format"` // plain, markdown, yaml, custom
	Config FormatConfig `json:"config,omitempty"`
}

type ParseResultItem struct {
	Title string `json:"title"`
	Done  bool   `json:"done"`
	Depth int    `json:"depth"`
}

type PreviewResponse struct {
	Items []ParseResultItem `json:"items"`
	Total int               `json:"total"`
}
