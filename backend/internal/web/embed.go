package web

import (
	"embed"
	"io/fs"
	"log"
	"os"
)

//go:embed dist
var embedded embed.FS

// FS returns the frontend filesystem.
// Returns nil when only API mode is available (no embedded frontend).
func FS() fs.FS {
	// Check if index.html exists in embedded dist
	f, err := embedded.Open("dist/index.html")
	if err != nil {
		log.Println("[budak] embedded dist/index.html not found, trying filesystem fallback")
		return fsFallback()
	}
	defer f.Close()

	stat, err := f.Stat()
	if err != nil {
		log.Println("[budak] could not stat embedded index.html, trying filesystem fallback")
		return fsFallback()
	}

	log.Printf("[budak] embedded dist/index.html found (%d bytes)", stat.Size())

	if stat.Size() < 100 {
		// Placeholder — real build is ~600+ bytes
		log.Println("[budak] embedded index.html is too small (placeholder), trying filesystem fallback")
		return fsFallback()
	}

	// Real embedded build
	return embedded
}

func fsFallback() fs.FS {
	candidates := []string{"frontend", "../frontend", "../../frontend"}
	for _, c := range candidates {
		if fi, err := os.Stat(c + "/dist/index.html"); err == nil && fi.Mode().IsRegular() {
			log.Printf("[budak] using filesystem frontend: %s/dist/index.html", c)
			return os.DirFS(c)
		}
	}
	log.Println("[budak] no frontend found — API-only mode")
	return nil
}
