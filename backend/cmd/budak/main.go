package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/enesbaytekin/budak/internal/api"
	"github.com/enesbaytekin/budak/internal/db"
	"github.com/enesbaytekin/budak/internal/repository"
	"github.com/enesbaytekin/budak/internal/service"
	"github.com/enesbaytekin/budak/internal/web"
	"github.com/joho/godotenv"
)

// Set via -ldflags at build time
var Version = "dev"

func main() {
	// Expose the build version to the API layer (health endpoint).
	api.Version = Version

	// Version flag
	if len(os.Args) > 1 && os.Args[1] == "version" {
		fmt.Println(Version)
		return
	}

	// Load .env from current directory
	_ = godotenv.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// SQLite
	database, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()
	log.Println("Connected to database")

	// Auto-create tables
	if err := db.AutoMigrate(ctx, database); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}
	log.Println("Migrations complete")

	// Repositories
	userRepo := repository.NewUserRepo(database)
	todoRepo := repository.NewTodoRepo(database)
	mindmapRepo := repository.NewMindMapRepo(database)

	// Services
	authService := service.NewAuthService(userRepo)
	impSvc := service.NewImportService(todoRepo)
	prefsSvc := service.NewPrefsService(database)

	// Router — serves API + embedded frontend SPA
	router := api.NewRouter(todoRepo, mindmapRepo, authService, impSvc, prefsSvc, web.FS())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		log.Println("Shutting down...")
		server.Shutdown(context.Background())
	}()

	log.Printf("Budak %s listening on :%s", Version, port)
	log.Printf("Open http://localhost:%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
	log.Println("Server stopped")
}
