// src/store/__tests__/authStore.test.ts
// Тесты authStore: login/logout/регистрация и состояния loading/error.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiPost = vi.fn();
const baseApiPost = vi.fn();
const invalidateQueries = vi.fn();

vi.mock('@/lib/api', () => ({
    api: { post: (...args: unknown[]) => apiPost(...args) },
    baseApi: { post: (...args: unknown[]) => baseApiPost(...args) },
}));

vi.mock('@/lib/queryClient', () => ({
    queryClient: { invalidateQueries: (...args: unknown[]) => invalidateQueries(...args) },
}));

import { useAuthStore } from '@/store/authStore';
import { getAccessToken, clearAccessToken } from '@/core/services/tokenManager';

describe('authStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearAccessToken();
        useAuthStore.setState({ loading: false, error: null });
    });

    describe('login', () => {
        it('успешный вход: возвращает true и сохраняет токен', async () => {
            apiPost.mockResolvedValueOnce({ data: { access_token: 'tok-1' } });

            const result = await useAuthStore.getState().login('user@test.ru', 'pass123');

            expect(result).toBe(true);
            expect(getAccessToken()).toBe('tok-1');
            expect(useAuthStore.getState().loading).toBe(false);
            expect(useAuthStore.getState().error).toBeNull();
        });

        it('вызывает /auth/token с form-urlencoded параметрами', async () => {
            apiPost.mockResolvedValueOnce({ data: { access_token: 'tok' } });
            await useAuthStore.getState().login('user@test.ru', 'pass123');

            expect(apiPost).toHaveBeenCalledWith(
                '/auth/token',
                expect.any(URLSearchParams),
                expect.objectContaining({
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }),
            );
        });

        it('инвалидирует кэш текущего пользователя', async () => {
            apiPost.mockResolvedValueOnce({ data: { access_token: 'tok' } });
            await useAuthStore.getState().login('user@test.ru', 'pass123');

            expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['current_user'] });
        });

        it('ошибка входа: возвращает false и сохраняет сообщение', async () => {
            apiPost.mockRejectedValueOnce({
                response: { data: { detail: 'Неверный пароль' } },
            });

            const result = await useAuthStore.getState().login('user@test.ru', 'wrong');

            expect(result).toBe(false);
            expect(useAuthStore.getState().error).toBe('Неверный пароль');
            expect(useAuthStore.getState().loading).toBe(false);
        });

        it('ошибка без detail даёт стандартное сообщение', async () => {
            apiPost.mockRejectedValueOnce(new Error('network'));
            await useAuthStore.getState().login('user@test.ru', 'pass');

            expect(useAuthStore.getState().error).toBe('Ошибка входа');
        });

        it('во время выполнения loading = true', async () => {
            let resolveLogin: (v: { data: { access_token: string } }) => void = () => { };
            apiPost.mockReturnValueOnce(new Promise(resolve => { resolveLogin = resolve; }));

            const promise = useAuthStore.getState().login('user@test.ru', 'pass123');
            expect(useAuthStore.getState().loading).toBe(true);

            resolveLogin({ data: { access_token: 'tok' } });
            await promise;
            expect(useAuthStore.getState().loading).toBe(false);
        });
    });

    describe('register', () => {
        const payload = {
            full_name: 'Иван Иванов',
            email: 'new@test.ru',
            password: 'Password1',
            privacy_policy_accepted: true,
            terms_accepted: true,
        };

        it('успешная регистрация: регистрирует и сразу входит', async () => {
            apiPost
                .mockResolvedValueOnce({ data: { id: 1 } })
                .mockResolvedValueOnce({ data: { access_token: 'tok-reg' } });

            const result = await useAuthStore.getState().register(payload);

            expect(result).toBe(true);
            expect(apiPost).toHaveBeenCalledTimes(2);
            expect(apiPost).toHaveBeenNthCalledWith(1, '/auth/register', payload);
            expect(getAccessToken()).toBe('tok-reg');
        });

        it('ошибка регистрации валидации: склеивает сообщения', async () => {
            apiPost.mockRejectedValueOnce({
                response: {
                    data: {
                        detail: [
                            { loc: ['body', 'email'], msg: 'уже занят' },
                            { loc: ['body', 'password'], msg: 'слишком прост' },
                        ],
                    },
                },
            });

            const result = await useAuthStore.getState().register(payload);

            expect(result).toBe(false);
            expect(useAuthStore.getState().error).toContain('уже занят');
            expect(useAuthStore.getState().error).toContain('слишком прост');
        });

        it('строчная ошибка регистрации сохраняется как есть', async () => {
            apiPost.mockRejectedValueOnce({
                response: { data: { detail: 'Email уже существует' } },
            });

            await useAuthStore.getState().register(payload);
            expect(useAuthStore.getState().error).toBe('Email уже существует');
        });
    });

    describe('logout', () => {
        it('очищает токен и вызывает серверный logout', async () => {
            apiPost.mockResolvedValueOnce({ data: { access_token: 'tok' } });
            await useAuthStore.getState().login('user@test.ru', 'pass123');
            expect(getAccessToken()).toBe('tok');

            baseApiPost.mockResolvedValueOnce({});
            await useAuthStore.getState().logout();

            expect(baseApiPost).toHaveBeenCalledWith('/auth/logout');
            expect(getAccessToken()).toBeNull();
        });

        it('не падает, если серверный logout недоступен', async () => {
            baseApiPost.mockRejectedValueOnce(new Error('network'));
            await expect(useAuthStore.getState().logout()).resolves.toBeUndefined();
            expect(getAccessToken()).toBeNull();
        });
    });
});
