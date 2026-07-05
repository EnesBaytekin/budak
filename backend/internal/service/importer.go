package service

import (
	"bufio"
	"fmt"
	"strings"

	"github.com/enesbaytekin/budak/internal/model"
)

type parsedTodo struct {
	Title     string
	Done      bool
	Depth     int
	SortOrder int
	ParentIdx int
}

func detectFormat(content string) string {
	lines := strings.Split(strings.TrimSpace(content), "\n")
	if len(lines) == 0 || (len(lines) == 1 && lines[0] == "") {
		return "plain"
	}
	hasDash := false
	hasBracket := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		stripped := strings.TrimSpace(line)
		if strings.HasPrefix(stripped, "- ") || strings.HasPrefix(stripped, "* ") {
			hasDash = true
		}
		if strings.Contains(stripped, "[ ]") || strings.Contains(stripped, "[x]") {
			hasBracket = true
		}
	}
	if hasBracket || hasDash {
		return "markdown"
	}
	return "plain"
}

// parseImport parses content with optional custom config.
// If config is provided with non-zero fields, it uses custom parsing.
func parseImport(content, format string, cfg ...model.FormatConfig) ([]parsedTodo, error) {
	if format == "" || format == "auto" {
		format = detectFormat(content)
	}

	// Use custom config if provided and has custom fields
	if len(cfg) > 0 {
		c := cfg[0]
		if c.DonePrefix != "" || c.UndonePrefix != "" || c.Indent != "" {
			return parseCustom(content, c.WithDefaults())
		}
	}

	switch format {
	case "plain":
		return parseIndented(content)
	case "markdown":
		return parseMarkdown(content)
	case "yaml":
		return parseIndented(content)
	case "custom":
		if len(cfg) > 0 {
			return parseCustom(content, cfg[0].WithDefaults())
		}
		return parseIndented(content)
	default:
		return nil, fmt.Errorf("unknown format: %s", format)
	}
}

// parseCustom parses content using fully custom config.
func parseCustom(content string, c model.FormatConfig) ([]parsedTodo, error) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	var todos []parsedTodo

	for scanner.Scan() {
		raw := scanner.Text()
		if strings.TrimSpace(raw) == "" {
			continue
		}

		// Measure indent: count leading occurrences of the indent string
		trimmed := raw
		depth := 0
		for strings.HasPrefix(trimmed, c.Indent) {
			depth++
			trimmed = trimmed[len(c.Indent):]
		}
		trimmed = strings.TrimSpace(trimmed)

		if trimmed == "" {
			continue
		}

		// Check for done/undone prefix
		title := trimmed
		done := false
		if c.DonePrefix != "" {
			if strings.HasPrefix(strings.ToLower(title), strings.ToLower(c.DonePrefix)) {
				done = true
				title = strings.TrimSpace(title[len(c.DonePrefix):])
			}
		}
		if !done && c.UndonePrefix != "" {
			if strings.HasPrefix(strings.ToLower(title), strings.ToLower(c.UndonePrefix)) {
				done = false
				title = strings.TrimSpace(title[len(c.UndonePrefix):])
			}
		}

		if title == "" {
			continue
		}

		parentIdx := -1
		for i := len(todos) - 1; i >= 0; i-- {
			if todos[i].Depth < depth {
				parentIdx = i
				break
			}
		}

		sortOrder := 0
		for _, t := range todos {
			if t.ParentIdx == parentIdx {
				sortOrder++
			}
		}

		todos = append(todos, parsedTodo{
			Title:     title,
			Done:      done,
			Depth:     depth,
			SortOrder: sortOrder,
			ParentIdx: parentIdx,
		})
	}

	return todos, nil
}

func parseIndented(content string) ([]parsedTodo, error) {
	return parseCustom(content, model.FormatConfig{
		Indent:       "  ",
		DonePrefix:   "[x]",
		UndonePrefix: "[ ]",
	})
}

func parseMarkdown(content string) ([]parsedTodo, error) {
	// Normalize: replace bullets with whitespace-preserving indent,
	// then parse as plain indented.
	scanner := bufio.NewScanner(strings.NewReader(content))
	var processed []string
	for scanner.Scan() {
		raw := scanner.Text()
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}

		// Count leading whitespace (the indent before the bullet or text)
		leading := raw[:len(raw)-len(strings.TrimLeft(raw, " \t"))]

		// Strip bullet marker if present
		body := trimmed
		for _, prefix := range []string{"- ", "* ", "+ "} {
			if strings.HasPrefix(body, prefix) {
				body = body[len(prefix):]
				break
			}
		}

		// Normalize indent: replace leading with Indent string repetition
		// Count original indent level (2 spaces = 1 level)
		indentLen := len(leading)
		depth := 0
		if indentLen > 0 {
			depth = (indentLen + 1) / 2
		}
		processed = append(processed, strings.Repeat("  ", depth)+body)
	}
	return parseCustom(strings.Join(processed, "\n"), model.FormatConfig{
		Indent:       "  ",
		DonePrefix:   "[x]",
		UndonePrefix: "[ ]",
	})
}

// ─── Export ──────────────────────────────────────────────────────

type flatExportItem struct {
	Title string
	Done  bool
	Depth int
}

func flattenTree(roots []*model.Todo, depth int) []flatExportItem {
	var out []flatExportItem
	for _, t := range roots {
		out = append(out, flatExportItem{Title: t.Title, Done: t.Done, Depth: depth})
		if len(t.Children) > 0 {
			out = append(out, flattenTree(t.Children, depth+1)...)
		}
	}
	return out
}

func Export(roots []*model.Todo, format string, cfg ...model.FormatConfig) (string, error) {
	flat := flattenTree(roots, 0)

	// Use custom format if config provided
	if len(cfg) > 0 {
		c := cfg[0]
		if c.Indent != "" || c.DonePrefix != "" || c.UndonePrefix != "" {
			return exportCustom(flat, c.WithDefaults()), nil
		}
	}

	switch format {
	case "plain":
		return exportPlain(flat), nil
	case "plain-simple":
		return exportPlainSimple(flat), nil
	case "markdown":
		return exportMarkdown(flat), nil
	case "yaml":
		return exportYAML(flat), nil
	case "custom":
		if len(cfg) > 0 {
			return exportCustom(flat, cfg[0].WithDefaults()), nil
		}
		return exportPlain(flat), nil
	default:
		return "", fmt.Errorf("unknown export format: %s", format)
	}
}

func exportCustom(items []flatExportItem, c model.FormatConfig) string {
	var b strings.Builder
	for _, item := range items {
		b.WriteString(strings.Repeat(c.Indent, item.Depth))
		if c.Bullet != "" {
			b.WriteString(c.Bullet)
		}
		if item.Done {
			b.WriteString(c.DonePrefix + " ")
		} else {
			b.WriteString(c.UndonePrefix + " ")
		}
		b.WriteString(item.Title)
		b.WriteString(c.EOL)
	}
	return b.String()
}

func exportPlain(items []flatExportItem) string {
	return exportCustom(items, model.FormatConfig{
		Indent:       "  ",
		DonePrefix:   "[x]",
		UndonePrefix: "[ ]",
		Bullet:       "",
		EOL:          "\n",
	})
}

func exportPlainSimple(items []flatExportItem) string {
	var b strings.Builder
	for _, item := range items {
		b.WriteString(strings.Repeat("  ", item.Depth))
		b.WriteString(item.Title)
		b.WriteString("\n")
	}
	return b.String()
}

func exportMarkdown(items []flatExportItem) string {
	return exportCustom(items, model.FormatConfig{
		Indent:       "  ",
		DonePrefix:   "[x]",
		UndonePrefix: "[ ]",
		Bullet:       "- ",
		EOL:          "\n",
	})
}

func exportYAML(items []flatExportItem) string {
	var b strings.Builder
	b.WriteString("todos:\n")
	for _, item := range items {
		b.WriteString(strings.Repeat("  ", item.Depth+1))
		b.WriteString("- title: ")
		b.WriteString(item.Title)
		b.WriteString("\n")
		if item.Done {
			b.WriteString(strings.Repeat("  ", item.Depth+1))
			b.WriteString("  done: true\n")
		}
	}
	return b.String()
}
