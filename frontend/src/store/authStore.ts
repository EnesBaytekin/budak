import { create } from "zustand";
import { getToken, setToken, setRefreshToken, clearTokens } from "../api/client";
import * as authApi from "../api/auth";
import * as treesApi from "../api/trees";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  registrationOpen: boolean;
  whitelistEnabled: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  isAuthenticated: !!getToken(),
  isLoading: !!getToken(),
  registrationOpen: true,
  whitelistEnabled: false,

  login: async (username, password) => {
    const res = await authApi.login(username, password);
    setToken(res.token);
    setRefreshToken(res.refresh_token);
    set({
      user: res.user,
      token: res.token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  register: async (username, password) => {
    const res = await authApi.register(username, password);
    setToken(res.token);
    setRefreshToken(res.refresh_token);
    // Auto-create a starter tree BEFORE setting authenticated
    try {
      await treesApi.createTree("My First Tree");
    } catch {
      // tree might already exist, ignore
    }
    set({
      user: res.user,
      token: res.token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    clearTokens();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const status = await authApi.getAuthStatus();
      set({
        isAuthenticated: status.authenticated,
        user: { id: status.user_id, username: status.username } as User,
        registrationOpen: status.registration_open,
        whitelistEnabled: status.whitelist_enabled,
        isLoading: false,
      });
    } catch {
      clearTokens();
      set({ isAuthenticated: false, isLoading: false, user: null });
    }
  },
}));
