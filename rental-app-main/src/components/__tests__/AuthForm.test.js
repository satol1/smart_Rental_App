import { jsx as _jsx } from "react/jsx-runtime";
// src/components/__tests__/AuthForm.test.tsx
// Тесты формы авторизации: валидация полей и сабмит через мок AuthService.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const loginMock = vi.fn();
const registerMock = vi.fn();
const loginAfterRegisterMock = vi.fn();
const setTokenMock = vi.fn();
vi.mock('@/core/services', () => ({
    AuthService: {
        login: (...args) => loginMock(...args),
        register: (...args) => registerMock(...args),
        loginAfterRegister: (...args) => loginAfterRegisterMock(...args),
        setToken: (...args) => setTokenMock(...args),
    },
}));
import AuthForm from '@/components/AuthForm';
function renderForm(onSuccess) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(MemoryRouter, { children: _jsx(AuthForm, { onSuccess: onSuccess }) }) }));
}
describe('AuthForm — режим входа', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('показывает заголовок входа', () => {
        renderForm();
        expect(screen.getByText('Вход в аккаунт')).toBeInTheDocument();
    });
    it('невалидный email показывает ошибку', async () => {
        const user = userEvent.setup();
        renderForm();
        await user.type(screen.getByLabelText(/email/i), 'not-an-email');
        await user.tab(); // trigger onBlur валидацию
        await waitFor(() => {
            expect(screen.getByText(/некорректный email/i)).toBeInTheDocument();
        });
    });
    it('валидный email не показывает ошибку', async () => {
        const user = userEvent.setup();
        renderForm();
        await user.type(screen.getByLabelText(/email/i), 'user@test.ru');
        await user.tab();
        await waitFor(() => {
            expect(screen.queryByText(/некорректный email/i)).not.toBeInTheDocument();
        });
    });
    it('успешный вход вызывает AuthService.login и колбэк', async () => {
        const onSuccess = vi.fn();
        loginMock.mockResolvedValueOnce({ access_token: 'tok', token_type: 'bearer' });
        loginAfterRegisterMock.mockResolvedValueOnce({ access_token: 'tok', token_type: 'bearer' });
        const user = userEvent.setup();
        renderForm(onSuccess);
        await user.type(screen.getByLabelText(/^email$/i), 'user@test.ru');
        await user.type(screen.getByLabelText('Пароль'), 'Password1');
        await user.click(screen.getByRole('button', { name: /^войти$/i }));
        await waitFor(() => {
            expect(loginMock).toHaveBeenCalledWith('user@test.ru', 'Password1');
        });
        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled();
        });
    });
    it('ошибка входа отображается в форме', async () => {
        // AuthService.login отклоняется с detail-ошибкой
        loginMock.mockImplementationOnce(() => {
            const err = new Error('bad');
            err.detail = 'Неверный пароль';
            throw err;
        });
        const user = userEvent.setup();
        renderForm();
        await user.type(screen.getByLabelText(/^email$/i), 'user@test.ru');
        await user.type(screen.getByLabelText('Пароль'), 'Password1');
        await user.click(screen.getByRole('button', { name: /^войти$/i }));
        await waitFor(() => {
            expect(screen.getByText('Неверный пароль')).toBeInTheDocument();
        });
    });
});
describe('AuthForm — режим регистрации', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        registerMock.mockResolvedValueOnce({ id: 1, email: 'new@test.ru' });
        loginAfterRegisterMock.mockResolvedValueOnce({ access_token: 'tok-reg', token_type: 'bearer' });
    });
    it('переключение на регистрацию показывает дополнительные поля', async () => {
        const user = userEvent.setup();
        renderForm();
        await user.click(screen.getByRole('button', { name: /нет аккаунта\?/i }));
        expect(screen.getByText('Регистрация')).toBeInTheDocument();
        expect(screen.getByLabelText(/фио/i)).toBeInTheDocument();
    });
    it('успешная регистрация вызывает register + loginAfterRegister', async () => {
        const onSuccess = vi.fn();
        const user = userEvent.setup();
        renderForm(onSuccess);
        await user.click(screen.getByRole('button', { name: /нет аккаунта\?/i }));
        await user.type(screen.getByLabelText(/фио/i), 'Иван Иванов');
        await user.type(screen.getByLabelText('Email *'), 'new@test.ru');
        await user.type(screen.getByLabelText('Пароль *'), 'Password1');
        // Согласия обязательны — отмечаем оба чекбокса
        const checkboxes = screen.getAllByRole('checkbox');
        for (const checkbox of checkboxes) {
            await user.click(checkbox);
        }
        // PhoneInput с маской подставляет плейсхолдер маски — вводим валидный номер
        const phoneInput = document.getElementById('phone');
        await user.clear(phoneInput);
        await user.type(phoneInput, '79001234567');
        await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }));
        expect(registerMock).toHaveBeenCalledTimes(1);
        await waitFor(() => {
            expect(loginAfterRegisterMock).toHaveBeenCalledWith('new@test.ru', 'Password1');
        });
        await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled();
        });
    });
});
