import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/app/App';

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
    (globalThis as unknown as Record<string, unknown>).IntersectionObserver =
      MockIntersectionObserver;
  }
});

vi.mock('@/lib/api', () => {
  const ok = (data: unknown = []) => Promise.resolve({ data });
  const client = {
    get: vi.fn(() => ok([])),
    post: ok,
    put: ok,
    patch: ok,
    delete: ok,
    request: ok,
    defaults: { headers: { common: {} } },
  };
  return { api: client, baseApi: client };
});

function renderWithRouter(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Legal Document Routes (152-ФЗ, 38-ФЗ)', () => {
  it('рендерит страницу политики конфиденциальности по адресу /privacy', async () => {
    renderWithRouter('/privacy');
    expect(await screen.findByRole('heading', { name: /Политика обработки персональных данных/i })).toBeInTheDocument();
  });

  it('рендерит страницу согласия на обработку данных по адресу /consent', async () => {
    renderWithRouter('/consent');
    expect(await screen.findByRole('heading', { name: /Согласие на обработку персональных данных/i })).toBeInTheDocument();
  });

  it('рендерит страницу пользовательского соглашения по адресу /terms', async () => {
    renderWithRouter('/terms');
    expect(await screen.findByRole('heading', { name: /Пользовательское соглашение/i })).toBeInTheDocument();
  });

  it('рендерит страницу политики cookie по адресу /cookies', async () => {
    renderWithRouter('/cookies');
    expect(await screen.findByRole('heading', { name: /Политика в отношении файлов cookie/i })).toBeInTheDocument();
  });

  it('рендерит страницу согласия на рассылки по адресу /marketing-consent', async () => {
    renderWithRouter('/marketing-consent');
    expect(await screen.findByRole('heading', { name: /Согласие на получение рекламных и информационных сообщений/i })).toBeInTheDocument();
  });
});
