/**
 * Тесты themeStore (T036):
 * - установка темы обновляет store и вешает/снимает класс dark на <html>;
 * - режим 'system' следует за prefers-color-scheme (syncSystemTheme);
 * - выбор персистится в localStorage под ключом 'theme'.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useThemeStore, THEME_STORAGE_KEY, applyThemeToDocument, } from '@/store/themeStore';
const originalMatchMedia = window.matchMedia;
function stubMatchMedia(matches) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}
function resetStore(theme = 'light') {
    useThemeStore.setState({
        theme,
        resolvedTheme: theme === 'system' ? 'light' : theme,
    });
}
describe('themeStore', () => {
    beforeEach(() => {
        window.localStorage.clear();
        document.documentElement.classList.remove('dark');
        stubMatchMedia(false);
        resetStore('light');
    });
    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: originalMatchMedia,
        });
        document.documentElement.classList.remove('dark');
    });
    it('setTheme("dark") ставит класс dark и обновляет store', () => {
        useThemeStore.getState().setTheme('dark');
        expect(useThemeStore.getState().theme).toBe('dark');
        expect(useThemeStore.getState().resolvedTheme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    it('setTheme("light") убирает класс dark', () => {
        useThemeStore.getState().setTheme('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        useThemeStore.getState().setTheme('light');
        expect(useThemeStore.getState().theme).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    it('режим system применяет prefers-color-scheme: dark', () => {
        stubMatchMedia(true);
        useThemeStore.getState().setTheme('system');
        expect(useThemeStore.getState().theme).toBe('system');
        expect(useThemeStore.getState().resolvedTheme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    it('syncSystemTheme пересчитывает тему при смене системной', () => {
        stubMatchMedia(true);
        useThemeStore.getState().setTheme('system');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        // Пользователь переключил системную тему на светлую
        stubMatchMedia(false);
        useThemeStore.getState().syncSystemTheme();
        expect(useThemeStore.getState().resolvedTheme).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    it('syncSystemTheme не трогает явные темы light/dark', () => {
        useThemeStore.getState().setTheme('dark');
        useThemeStore.getState().syncSystemTheme();
        expect(useThemeStore.getState().theme).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    it('persist сохраняет выбор под ключом "theme" в localStorage', async () => {
        useThemeStore.getState().setTheme('dark');
        // zustand persist пишет асинхронно-совместимо; ждём запись
        await vi.waitFor(() => {
            expect(window.localStorage.getItem(THEME_STORAGE_KEY)).not.toBeNull();
        });
        const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
        const parsed = JSON.parse(raw);
        expect(parsed.state.theme).toBe('dark');
    });
    it('applyThemeToDocument возвращает разрешённую тему', () => {
        expect(applyThemeToDocument('dark')).toBe('dark');
        expect(applyThemeToDocument('light')).toBe('light');
        stubMatchMedia(true);
        expect(applyThemeToDocument('system')).toBe('dark');
    });
});
