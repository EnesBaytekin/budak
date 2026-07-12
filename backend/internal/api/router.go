package api

import (
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/enesbaytekin/budak/internal/repository"
	"github.com/enesbaytekin/budak/internal/service"
)

// Version is set via -ldflags at build time.
// It's declared here so the health endpoint can reference it.
var Version = "dev"

func NewRouter(todoRepo *repository.TodoRepo, mindmapRepo *repository.MindMapRepo, authService *service.AuthService, impSvc *service.ImportService, frontendFS fs.FS) http.Handler {
	r := chi.NewRouter()

	// Middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RequestID)

	// CORS
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "*"
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigins},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		MaxAge:           300,
	}))

	// Handlers
	authHandler := NewAuthHandler(authService)
	treeHandler := NewTreeHandler(todoRepo)
	todoHandler := NewTodoHandler(todoRepo)
	mindmapHandler := NewMindMapHandler(service.NewMindMapService(mindmapRepo))
	impexpHandler := NewImpExpHandler(impSvc)

	// ─── Public Routes ───────────────────────────────────

	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.Post("/refresh", authHandler.Refresh)
	})

	r.Get("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		hasFS := frontendFS != nil
		jsonResp(w, map[string]interface{}{
			"status":       "ok",
			"version":      Version,
			"has_frontend": hasFS,
		}, http.StatusOK)
	})

	// Import preview (no auth needed — text parsing only)
	r.Post("/api/v1/import/preview", impexpHandler.PreviewImport)

	// ─── Protected Routes ────────────────────────────────
	r.Group(func(r chi.Router) {
		r.Use(AuthMiddleware(authService))

		r.Get("/api/v1/auth/status", authHandler.Status)

		r.Get("/api/v1/trees", treeHandler.List)
		r.Post("/api/v1/trees", treeHandler.Create)
		r.Get("/api/v1/trees/{treeID}", treeHandler.Get)
		r.Put("/api/v1/trees/{treeID}", treeHandler.Update)
		r.Delete("/api/v1/trees/{treeID}", treeHandler.Delete)

		r.Get("/api/v1/trees/{treeID}/todos", todoHandler.List)
		r.Post("/api/v1/trees/{treeID}/todos", todoHandler.Create)
		r.Put("/api/v1/todos/{todoID}", todoHandler.Update)
		r.Delete("/api/v1/todos/{todoID}", todoHandler.Delete)
		r.Patch("/api/v1/todos/{todoID}/move", todoHandler.Move)
		r.Patch("/api/v1/todos/{todoID}/reorder-up", todoHandler.ReorderUp)
		r.Patch("/api/v1/todos/{todoID}/reorder-down", todoHandler.ReorderDown)
		r.Patch("/api/v1/todos/{todoID}/move-before", todoHandler.MoveBefore)

		r.Get("/api/v1/trees/{treeID}/positions", mindmapHandler.GetPositions)
		r.Post("/api/v1/trees/{treeID}/positions", mindmapHandler.BatchUpsertPositions)
		r.Put("/api/v1/mindmap/positions/{todoID}", mindmapHandler.UpsertPosition)
		r.Delete("/api/v1/mindmap/positions/{todoID}", mindmapHandler.DeletePosition)

		// Import / Export
		r.Post("/api/v1/trees/{treeID}/import", impexpHandler.Import)
		r.Get("/api/v1/trees/{treeID}/export", impexpHandler.Export)
		r.Post("/api/v1/trees/{treeID}/export/preview", impexpHandler.PreviewExport)
	})

	// ─── Frontend SPA ────────────────────────────────────
	// ─── Frontend SPA ────────────────────────────────────
	if frontendFS != nil {
		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				path = "index.html"
			}

			data, err := fs.ReadFile(frontendFS, "dist/"+path)
			if err != nil {
				data, err = fs.ReadFile(frontendFS, "dist/index.html")
				if err != nil {
					http.Error(w, "Not Found", http.StatusNotFound)
					return
				}
				path = "index.html"
			}

			// Set Content-Type from extension
			if strings.HasSuffix(path, ".js") {
				w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
			} else if strings.HasSuffix(path, ".css") {
				w.Header().Set("Content-Type", "text/css; charset=utf-8")
			} else if strings.HasSuffix(path, ".svg") {
				w.Header().Set("Content-Type", "image/svg+xml")
			} else {
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
			}

			w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
			w.Header().Set("Cache-Control", "no-transform, public, max-age=31536000, immutable")
			w.WriteHeader(http.StatusOK)
			w.Write(data)
		})
	}

	return r
}
