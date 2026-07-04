package api

import (
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

func NewRouter(todoRepo *repository.TodoRepo, mindmapRepo *repository.MindMapRepo, authService *service.AuthService, frontendFS fs.FS) http.Handler {
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

	// ─── API Routes ──────────────────────────────────────

	// Public
	r.Route("/api/v1/auth", func(r chi.Router) {
		r.Post("/register", authHandler.Register)
		r.Post("/login", authHandler.Login)
		r.Post("/refresh", authHandler.Refresh)
	})

	// Health
	r.Get("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		jsonResp(w, map[string]string{"status": "ok"}, http.StatusOK)
	})

	// Protected
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
	})

	// ─── Frontend SPA ────────────────────────────────────

	// Only register frontend serving if we have an embedded FS
	if frontendFS != nil {
		// Resolve possible "dist" subdirectory inside the embed
		subFS, err := fs.Sub(frontendFS, "dist")
		if err != nil {
			// fallback: use the FS as-is
			subFS = frontendFS
		}

		fileServer := http.FileServer(http.FS(subFS))

		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				path = "index.html"
			}

			// Try the requested path; on miss, serve index.html (SPA fallback)
			if _, err := subFS.Open(path); err != nil {
				r.URL.Path = "/index.html"
			} else {
				r.URL.Path = "/" + path
			}

			fileServer.ServeHTTP(w, r)
		})
	}

	return r
}
