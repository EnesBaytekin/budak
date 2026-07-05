package web

import (
	"embed"
	"io/fs"
	"os"
)

//go:embed dist
var embedded embed.FS

// FS returns the frontend filesystem.
// Return nil when no real frontend build is available (API-only mode).
func FS() fs.FS {
	// Real production build has dist/assets/ — anything less is a dev placeholder
	if _, err := embedded.Open("dist/assets"); err == nil {
		return embedded
	}

	// Dev fallback: serve from frontend source dir
	candidates := []string{
		"../frontend",
		"../../frontend",
		"frontend",
	}
	for _, c := range candidates {
		if fi, err := os.Stat(c + "/dist/index.html"); err == nil && fi.Mode().IsRegular() {
			return os.DirFS(c)
		}
	}

	// No frontend — API only (Vite dev server handles UI)
	return nil
}
