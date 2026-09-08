import { jsx as _jsx } from "react/jsx-runtime";
// src/components/__tests__/ThemeSwitcher.test.tsx
// Тесты переключателя темы: доступность, выбор темы, синхронизация со стором.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSwitcher from '@/components/layout/ThemeSwitcher';
import { useThemeStore } from '@/store/themeStore';
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
describe('ThemeSwitcher', () => {
    beforeEach(() => {
        stubMatchMedia(false);
        useThemeStore.setState({ theme: 'light', resolvedTheme: 'light' });
    });
    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: originalMatchMedia,
        });
    });
    it('рендерит кнопку с aria-label текущей темы', () => {
        render(_jsx(ThemeSwitcher, {}));
        const btn = screen.getByRole('button', { name: /тема оформления/i });
        expect(btn).toBeInTheDocument();
    });
    it('открывает меню со всеми вариантами темы', () => {
        render(_jsx(ThemeSwitcher, {}));
        fireEvent.click(screen.getByRole('button', { name: /тема оформления/i }));
        expect(screen.getByRole('button', { name: /^светлое$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^тёмное$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^системное$/i })).toBeInTheDocument();
    });
    it('выбор «Тёмное» обновляет стор', () => {
        render(_jsx(ThemeSwitcher, {}));
        fireEvent.click(screen.getByRole('button', { name: /тема оформления/i }));
        fireEvent.click(screen.getByRole('button', { name: /^тёмное$/i }));
        expect(useThemeStore.getState().theme).toBe('dark');
        expect(useThemeStore.getState().resolvedTheme).toBe('dark');
    });
    it('активный вариант помечен aria-pressed', () => {
        render(_jsx(ThemeSwitcher, {}));
        fireEvent.click(screen.getByRole('button', { name: /тема оформления/i }));
        const light = screen.getByRole('button', { name: /^светлое$/i });
        expect(light).toHaveAttribute('aria-pressed', 'true');
    });
    it('меню закрывается после выбора', () => {
        render(_jsx(ThemeSwitcher, {}));
        fireEvent.click(screen.getByRole('button', { name: /тема оформления/i }));
        fireEvent.click(screen.getByRole('button', { name: /^системное$/i }));
        expect(screen.queryByRole('button', { name: /^светлое$/i })).not.toBeInTheDocument();
    });
});
