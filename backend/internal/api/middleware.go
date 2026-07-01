package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/enesbaytekin/budak/internal/service"
)

type contextKey string

const (
	userIDKey   contextKey = "user_id"
	usernameKey contextKey = "username"
)

func AuthMiddleware(authService *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				http.Error(w, `{"error":"invalid authorization header"}`, http.StatusUnauthorized)
				return
			}

			userID, username, err := authService.ValidateToken(parts[1])
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			ctx = context.WithValue(ctx, usernameKey, username)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(r *http.Request) string {
	if v, ok := r.Context().Value(userIDKey).(string); ok {
		return v
	}
	return ""
}

func GetUsername(r *http.Request) string {
	if v, ok := r.Context().Value(usernameKey).(string); ok {
		return v
	}
	return ""
}
