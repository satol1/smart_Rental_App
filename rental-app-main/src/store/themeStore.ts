// src/store/themeStore.ts
// Управление темой: 'light' | 'dark' | 'system'.
// Класс 'dark' вешается на document.documentElement.
// persist в localStorage под ключом 'theme'
// (единственное согласованное исключение из правила «zustand без persist»).

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Ставит/убирает класс dark на <html> согласно теме */
export function applyThemeToDocument(theme: Theme): ResolvedTheme {
  const resolved: ResolvedTheme = theme === "system" ? getSystemTheme() : theme;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }
  return resolved;
}

interface ThemeState {
  theme: Theme;
  /** Фактически применённая тема (system уже разрешён) */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Пересчитать resolvedTheme (вызывается слушателем matchMedia) */
  syncSystemTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      resolvedTheme: "light",

      setTheme: (theme: Theme) => {
        const resolvedTheme = applyThemeToDocument(theme);
        set({ theme, resolvedTheme });
      },

      syncSystemTheme: () => {
        const { theme } = get();
        if (theme !== "system") return;
        const resolvedTheme = applyThemeToDocument(theme);
        set({ resolvedTheme });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      // Персистим только выбор пользователя
      partialize: (state) => ({ theme: state.theme }),
      // Сразу после регидрации применяем класс к документу
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedTheme = applyThemeToDocument(state.theme);
          useThemeStore.setState({ resolvedTheme });
        }
      },
    },
  ),
);

let systemThemeListenerAttached = false;

/**
 * Подписка на системную тему (для режима 'system').
 * Вызывается один раз из main.tsx; в тестах можно не вызывать.
 */
export function initThemeSystemListener(): () => void {
  if (
    systemThemeListenerAttached ||
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => undefined;
  }
  systemThemeListenerAttached = true;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => useThemeStore.getState().syncSystemTheme();

  media.addEventListener("change", handleChange);

  // Применяем сохранённую/дефолтную тему на старте приложения
  const { theme } = useThemeStore.getState();
  const resolvedTheme = applyThemeToDocument(theme);
  useThemeStore.setState({ resolvedTheme });

  return () => {
    media.removeEventListener("change", handleChange);
    systemThemeListenerAttached = false;
  };
}
