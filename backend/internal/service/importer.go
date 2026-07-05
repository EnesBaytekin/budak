package service

import (
	"bufio"
	"fmt"
	"strings"

	"github.com/enesbaytekin/budak/internal/model"
)

// parsedTodo is an intermediate struct used during import parsing.
type parsedTodo struct {
	Title     string
	Done      bool
	Depth     int  // indent level (0 = root)
	SortOrder int  // order among siblings
	ParentIdx int  // index of parent in the flat parsed list (-1 = root)
}

// detectFormat tries to determine the input format from content.
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
		if strings.HasPrefix(strings.TrimSpace(line), "---") {
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

	if hasBracket {
		return "markdown"
	}
	if hasDash {
		return "markdown"
	}
	return "plain"
}

// parseImport parses content string into flat list of parsedTodo items.
// Parents come before children in the result.
func parseImport(content, format string) ([]parsedTodo, error) {
	if format == "" || format == "auto" {
		format = detectFormat(content)
	}
	switch format {
	case "plain":
		return parseIndented(content)
	case "markdown":
		return parseMarkdown(content)
	case "yaml":
		return parseIndented(content) // simple fallback
	default:
		return nil, fmt.Errorf("unknown format: %s", format)
	}
}

// parseIndented handles indentation-based plain text.
// Each 2 spaces = 1 level. Supports [x] and [ ] for done status.
func parseIndented(content string) ([]parsedTodo, error) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	var todos []parsedTodo
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		raw := scanner.Text()
		trimmed := strings.TrimLeft(raw, " \t")
		if trimmed == "" || strings.HasPrefix(trimmed, "#") || strings.HasPrefix(trimmed, "//") {
			continue
		}

		indent := len(raw) - len(trimmed)
		depth := 0
		if indent > 0 {
			depth = (indent + 1) / 2
		}

		title := trimmed
		done := false

		lower := strings.ToLower(strings.TrimSpace(title))
		if strings.HasPrefix(lower, "[x]") {
			done = true
			title = strings.TrimSpace(title[3:])
		} else if strings.HasPrefix(lower, "[ ]") {
			done = false
			title = strings.TrimSpace(title[3:])
		}

		if title == "" {
			continue
		}

		// Find parent: last todo with depth < current
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
			Title:     strings.TrimSpace(title),
			Done:      done,
			Depth:     depth,
			SortOrder: sortOrder,
			ParentIdx: parentIdx,
		})
	}

	return todos, nil
}

// parseMarkdown handles markdown-style lists.
// Supports: - * + markers, [x] [ ] checkboxes.
func parseMarkdown(content string) ([]parsedTodo, error) {
	scanner := bufio.NewScanner(strings.NewReader(content))
	var todos []parsedTodo
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		raw := scanner.Text()
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}

		indent := len(raw) - len(strings.TrimLeft(raw, " \t"))
		depth := 0
		if indent > 0 {
			depth = (indent + 1) / 2
		}

		// Strip list marker
		title := trimmed
		for _, prefix := range []string{"- ", "* ", "+ "} {
			if strings.HasPrefix(title, prefix) {
				title = title[len(prefix):]
				break
			}
		}

		if title == "" {
			continue
		}

		done := false
		lower := strings.ToLower(strings.TrimSpace(title))
		if strings.HasPrefix(lower, "[x]") {
			done = true
			title = strings.TrimSpace(title[3:])
		} else if strings.HasPrefix(lower, "[ ]") {
			done = false
			title = strings.TrimSpace(title[3:])
		}

		if title == "" {
			continue
		}

		// Find parent
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
			Title:     strings.TrimSpace(title),
			Done:      done,
			Depth:     depth,
			SortOrder: sortOrder,
			ParentIdx: parentIdx,
		})
	}

	return todos, nil
}

// ─── Export ──────────────────────────────────────────────────────

type flatExportItem struct {
	Title string
	Done  bool
	Depth int
}

// flattenTree converts nested todos into flat export items (pre-order).
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

// Export generates text in the requested format from nested todos.
func Export(roots []*model.Todo, format string) (string, error) {
	flat := flattenTree(roots, 0)
	switch format {
	case "plain":
		return exportPlain(flat), nil
	case "plain-simple":
		return exportPlainSimple(flat), nil
	case "markdown":
		return exportMarkdown(flat), nil
	case "yaml":
		return exportYAML(flat), nil
	default:
		return "", fmt.Errorf("unknown export format: %s", format)
	}
}

func exportPlain(items []flatExportItem) string {
	var b strings.Builder
	for _, item := range items {
		indent := strings.Repeat("  ", item.Depth)
		check := " "
		if item.Done {
			check = "x"
		}
		b.WriteString(fmt.Sprintf("%s[%s] %s\n", indent, check, item.Title))
	}
	return b.String()
}

func exportPlainSimple(items []flatExportItem) string {
	var b strings.Builder
	for _, item := range items {
		indent := strings.Repeat("  ", item.Depth)
		b.WriteString(fmt.Sprintf("%s%s\n", indent, item.Title))
	}
	return b.String()
}

func exportMarkdown(items []flatExportItem) string {
	var b strings.Builder
	for _, item := range items {
		indent := strings.Repeat("  ", item.Depth)
		check := " "
		if item.Done {
			check = "x"
		}
		b.WriteString(fmt.Sprintf("%s- [%s] %s\n", indent, check, item.Title))
	}
	return b.String()
}

func exportYAML(items []flatExportItem) string {
	var b strings.Builder
	b.WriteString("todos:\n")
	for _, item := range items {
		indent := strings.Repeat("  ", item.Depth+1)
		b.WriteString(fmt.Sprintf("%s- title: %s\n", indent, item.Title))
		if item.Done {
			b.WriteString(fmt.Sprintf("%s  done: true\n", indent))
		}
	}
	return b.String()
}
