package main

import (
	"context"
	"crypto/tls"
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
	"golang.org/x/crypto/acme/autocert"
)

func main() {
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

	// Router — serves API + embedded frontend SPA
	router := api.NewRouter(todoRepo, mindmapRepo, authService, web.FrontendDist)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	domain := os.Getenv("DOMAIN")
	certFile := os.Getenv("TLS_CERT")
	keyFile := os.Getenv("TLS_KEY")

	// ─── HTTPS Mode ───────────────────────────────────────
	if certFile != "" && keyFile != "" {
		// Custom TLS certificates
		server := &http.Server{
			Addr:         ":443",
			Handler:      router,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		}

		go func() {
			sigChan := make(chan os.Signal, 1)
			signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
			<-sigChan
			log.Println("Shutting down...")
			server.Shutdown(context.Background())
		}()

		// HTTP→HTTPS redirect on :80
		go func() {
			log.Println("Listening on :80 (HTTP→HTTPS redirect)")
			http.ListenAndServe(":80", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "https://"+r.Host+r.URL.String(), http.StatusMovedPermanently)
			}))
		}()

		log.Printf("Budak listening on https://%s (custom cert)", domain)
		if err := server.ListenAndServeTLS(certFile, keyFile); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
		return
	}

	if domain != "" {
		// Let's Encrypt auto TLS
		certManager := autocert.Manager{
			Prompt:     autocert.AcceptTOS,
			HostPolicy: autocert.HostWhitelist(domain),
			Cache:      autocert.DirCache("cert-cache"),
		}

		server := &http.Server{
			Addr:      ":443",
			Handler:   router,
			TLSConfig: &tls.Config{GetCertificate: certManager.GetCertificate},
		}

		go func() {
			sigChan := make(chan os.Signal, 1)
			signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
			<-sigChan
			log.Println("Shutting down...")
			server.Shutdown(context.Background())
		}()

		// HTTP→HTTPS redirect + Let's Encrypt challenge handler on :80
		go func() {
			log.Printf("Listening on :80 (HTTP→HTTPS redirect + ACME)")
			if err := http.ListenAndServe(":80", certManager.HTTPHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Redirect(w, r, "https://"+r.Host+r.URL.String(), http.StatusMovedPermanently)
			}))); err != nil {
				log.Fatalf("HTTP redirect server error: %v", err)
			}
		}()

		log.Printf("Budak listening on https://%s (Let's Encrypt)", domain)
		if err := server.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
		return
	}

	// ─── Plain HTTP Mode ──────────────────────────────────
	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		log.Println("Shutting down...")
		server.Shutdown(context.Background())
	}()

	log.Printf("Budak listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
	log.Println("Server stopped")
}
