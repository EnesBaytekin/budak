import { create } from "zustand";

type Theme = "cupcake" | "dim";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "cupcake";
  const stored = localStorage.getItem("tudo-theme");
  if (stored === "cupcake" || stored === "dim") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dim" : "cupcake";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("tudo-theme", theme);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initial = getInitialTheme();
  applyTheme(initial);

  return {
    theme: initial,
    toggle: () => {
      const next = get().theme === "cupcake" ? "dim" : "cupcake";
      applyTheme(next);
      set({ theme: next });
    },
    setTheme: (t) => {
      applyTheme(t);
      set({ theme: t });
    },
  };
});
