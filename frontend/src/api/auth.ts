import { apiRequest } from "./client";
import type { AuthResponse } from "../types";

export function login(username: string, password: string) {
  return apiRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: { username, password },
    skipAuth: true,
  });
}

export function register(username: string, email: string, password: string) {
  return apiRequest<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: { username, email, password },
    skipAuth: true,
  });
}

export function refresh(refreshToken: string) {
  return apiRequest<AuthResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
    skipAuth: true,
  });
}

export function getAuthStatus() {
  return apiRequest<{ authenticated: boolean; user_id: string; username: string; registration_open: boolean }>(
    "/api/v1/auth/status"
  );
}
