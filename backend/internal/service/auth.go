package service

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/enesbaytekin/budak/internal/model"
	"github.com/enesbaytekin/budak/internal/repository"
)

type AuthService struct {
	userRepo         *repository.UserRepo
	jwtSecret        string
	accessExpiry     time.Duration
	refreshExpiry    time.Duration
	registrationOpen bool
	whitelistEnabled bool
	whitelistUsers   map[string]bool
}

func NewAuthService(userRepo *repository.UserRepo) *AuthService {
	accessExpiry, _ := time.ParseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m"))
	refreshExpiry, _ := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRY", "7d"))
	registrationOpen := getEnv("REGISTRATION_OPEN", "true") == "true"

	whitelistEnabled := getEnv("WHITELIST_ENABLED", "false") == "true"
	whitelistUsers := loadWhitelist(whitelistEnabled)

	return &AuthService{
		userRepo:         userRepo,
		jwtSecret:        os.Getenv("JWT_SECRET"),
		accessExpiry:     accessExpiry,
		refreshExpiry:    refreshExpiry,
		registrationOpen: registrationOpen,
		whitelistEnabled: whitelistEnabled,
		whitelistUsers:   whitelistUsers,
	}
}

func loadWhitelist(enabled bool) map[string]bool {
	users := make(map[string]bool)
	if !enabled {
		return users
	}

	path := getEnv("WHITELIST_FILE", "whitelist.txt")
	f, err := os.Open(path)
	if err != nil {
		return users
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		u := strings.TrimSpace(scanner.Text())
		if u != "" && !strings.HasPrefix(u, "#") {
			users[strings.ToLower(u)] = true
		}
	}
	return users
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func (s *AuthService) Register(ctx context.Context, req model.RegisterRequest) (*model.AuthResponse, error) {
	if !s.registrationOpen {
		count, err := s.userRepo.Count(ctx)
		if err != nil {
			return nil, fmt.Errorf("check users: %w", err)
		}
		if count > 0 {
			return nil, errors.New("registration is closed")
		}
	}

	// Whitelist check
	if s.whitelistEnabled && len(s.whitelistUsers) > 0 {
		if !s.whitelistUsers[strings.ToLower(req.Username)] {
			return nil, errors.New("registration not allowed for this username")
		}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user, err := s.userRepo.Create(ctx, req, string(hashedPassword))
	if err != nil {
		return nil, err
	}

	token, refreshToken, err := s.generateTokens(user.ID, user.Username)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         *user,
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req model.LoginRequest) (*model.AuthResponse, error) {
	user, err := s.userRepo.FindByUsername(ctx, req.Username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	token, refreshToken, err := s.generateTokens(user.ID, user.Username)
	if err != nil {
		return nil, err
	}

	user.Password = ""
	return &model.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         *user,
	}, nil
}

func (s *AuthService) ValidateToken(tokenString string) (string, string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		return "", "", fmt.Errorf("parse token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", "", errors.New("invalid token")
	}

	userID := claims["user_id"].(string)
	username := claims["username"].(string)
	return userID, username, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, refreshTokenString string) (*model.AuthResponse, error) {
	userID, username, err := s.ValidateToken(refreshTokenString)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	token, newRefreshToken, err := s.generateTokens(userID, username)
	if err != nil {
		return nil, err
	}

	return &model.AuthResponse{
		Token:        token,
		RefreshToken: newRefreshToken,
		User:         *user,
	}, nil
}

func (s *AuthService) IsRegistrationOpen() bool {
	return s.registrationOpen
}

func (s *AuthService) IsWhitelistEnabled() bool {
	return s.whitelistEnabled
}

type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

func (s *AuthService) generateTokens(userID, username string) (string, string, error) {
	now := time.Now()

	accessClaims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	token, err := accessToken.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", "", fmt.Errorf("sign access token: %w", err)
	}

	refreshClaims := Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.refreshExpiry)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenStr, err := refreshToken.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", "", fmt.Errorf("sign refresh token: %w", err)
	}

	return token, refreshTokenStr, nil
}
