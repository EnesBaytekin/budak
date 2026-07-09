import { create } from "zustand";
import { getToken, setToken, setRefreshToken, clearTokens, refreshToken } from "../api/client";
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
    set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
  },

  register: async (username, password) => {
    const res = await authApi.register(username, password);
    setToken(res.token);
    setRefreshToken(res.refresh_token);
    try { await treesApi.createTree("My First Tree"); } catch {}
    set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    clearTokens();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    console.log("[budak] checkAuth basladi, token var:", !!getToken(), "refresh var:", !!localStorage.getItem("budak_refresh"));

    if (!getToken()) {
      console.log("[budak] token yok -> login");
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    const newToken = await refreshToken();
    console.log("[budak] refresh sonucu token geldi:", !!newToken, "localStorage'ta token var:", !!getToken());

    if (!newToken && !getToken()) {
      console.log("[budak] refresh basarisiz VE token silinmis -> login sayfasi");
      set({ isAuthenticated: false, isLoading: false, user: null });
      return;
    }

    try {
      const status = await authApi.getAuthStatus();
      console.log("[budak] status OK, authenticated:", status.authenticated);
      set({
        isAuthenticated: status.authenticated,
        user: { id: status.user_id, username: status.username } as User,
        registrationOpen: status.registration_open,
        whitelistEnabled: status.whitelist_enabled,
        isLoading: false,
      });
    } catch (e) {
      console.log("[budak] status hatasi:", e);
      set({ isLoading: false });
    }
  },
}));
