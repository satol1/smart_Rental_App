import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Тесты ленивых маршрутов (T028):
 * - все страницы подключены через React.lazy;
 * - пока чанк грузится, показывается PageFallback (скелетон, не пустой div);
 * - после резолва ленивого чанка рендерится контент страницы.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/app/App';
import PageFallback from '@/components/shared/PageFallback';
// jsdom не реализует IntersectionObserver (нужен HomePage)
beforeAll(() => {
    if (!('IntersectionObserver' in globalThis)) {
        class MockIntersectionObserver {
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
            takeRecords = vi.fn(() => []);
            root = null;
            rootMargin = '';
            thresholds = [];
        }
        globalThis.IntersectionObserver =
            MockIntersectionObserver;
    }
});
// Изолируем от сети: API отвечает пустыми данными (детерминированно, без retry-циклов)
vi.mock('@/lib/api', () => {
    const ok = (data = []) => Promise.resolve({ data });
    const client = {
        get: vi.fn(() => ok()),
        post: ok,
        put: ok,
        patch: ok,
        delete: ok,
        request: ok,
        defaults: { headers: { common: {} } },
    };
    return { api: client, baseApi: client };
});
function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: 0 },
            mutations: { retry: false },
        },
    });
}
function renderAppAt(initialEntry) {
    return render(_jsx(QueryClientProvider, { client: createTestQueryClient(), children: _jsx(MemoryRouter, { initialEntries: [initialEntry], children: _jsx(App, {}) }) }));
}
describe('Lazy routes + PageFallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
    });
    it('главная страница: сначала PageFallback, затем контент HomePage', async () => {
        renderAppAt('/');
        // Пока lazy-чанк HomePage не резолвился — скелетон страницы
        expect(screen.getByTestId('page-fallback')).toBeInTheDocument();
        // Чанк резолвится — рендерится реальный контент главной
        expect(await screen.findByText('Каталог оборудования', {}, { timeout: 10000 })).toBeInTheDocument();
        // Fallback исчез после загрузки
        expect(screen.queryByTestId('page-fallback')).not.toBeInTheDocument();
    }, 10000);
    it('маршрут /forbidden резолвится через lazy и рендерит 403', async () => {
        renderAppAt('/forbidden');
        expect(screen.getByTestId('page-fallback')).toBeInTheDocument();
        expect(await screen.findByText('Доступ запрещен', {}, { timeout: 3000 })).toBeInTheDocument();
    });
    it('неизвестный маршрут рендерит NotFoundPage (lazy)', async () => {
        renderAppAt('/definitely/not/a/route');
        expect(await screen.findByText('Страница не найдена', {}, { timeout: 3000 })).toBeInTheDocument();
    });
    it('PageFallback — это не пустой div: содержит шиммер-блоки', () => {
        render(_jsx(PageFallback, {}));
        const fallback = screen.getByTestId('page-fallback');
        expect(fallback).toHaveAttribute('role', 'status');
        // Достаточно блоков-скелетонов внутри (лого-плейсхолдер + сетка карточек)
        const blocks = fallback.querySelectorAll('.animate-pulse');
        expect(blocks.length).toBeGreaterThan(5);
    });
});
