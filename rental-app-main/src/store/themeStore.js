// src/store/themeStore.ts
// Управление темой: 'light' | 'dark' | 'system'.
// Класс 'dark' вешается на document.documentElement.
// persist в localStorage под ключом 'theme'
// (единственное согласованное исключение из правила «zustand без persist»).
import { create } from "zustand";
import { persist } from "zustand/middleware";
export const THEME_STORAGE_KEY = "theme";
function getSystemTheme() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}
/** Ставит/убирает класс dark на <html> согласно теме */
export function applyThemeToDocument(theme) {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", resolved === "dark");
    }
    return resolved;
}
export const useThemeStore = create()(persist((set, get) => ({
    theme: "light",
    resolvedTheme: "light",
    setTheme: (theme) => {
        const resolvedTheme = applyThemeToDocument(theme);
        set({ theme, resolvedTheme });
    },
    syncSystemTheme: () => {
        const { theme } = get();
        if (theme !== "system")
            return;
        const resolvedTheme = applyThemeToDocument(theme);
        set({ resolvedTheme });
    },
}), {
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
}));
let systemThemeListenerAttached = false;
/**
 * Подписка на системную тему (для режима 'system').
 * Вызывается один раз из main.tsx; в тестах можно не вызывать.
 */
export function initThemeSystemListener() {
    if (systemThemeListenerAttached ||
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function") {
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
