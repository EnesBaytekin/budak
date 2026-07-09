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
	// Check for a real embedded build (index.html > 200 bytes = real build)
	f, err := embedded.Open("dist/index.html")
	if err != nil {
		log.Println("[budak] no embedded dist/index.html, trying filesystem fallback")
		return fsFallback()
	}
	defer f.Close()

	stat, _ := f.Stat()
	if stat != nil && stat.Size() > 200 {
		return embedded
	}

	log.Println("[budak] embedded dist/index.html is placeholder, trying filesystem fallback")
	return fsFallback()
}

func fsFallback() fs.FS {
	candidates := []string{"../frontend", "../../frontend", "frontend"}
	for _, c := range candidates {
		if fi, err := os.Stat(c + "/dist/index.html"); err == nil && fi.Mode().IsRegular() {
			return os.DirFS(c)
		}
	}
	return nil
}
