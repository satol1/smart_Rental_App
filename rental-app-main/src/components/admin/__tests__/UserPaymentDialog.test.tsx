// src/components/admin/__tests__/UserPaymentDialog.test.tsx
// Тесты диалога финансов пользователя: открытие, режимы, валидация, сабмит.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserPaymentDialog } from '@/components/admin/UserPaymentDialog';
import type { UserOut } from '@/types/user';

const mutatePayment = vi.fn();
const mutateAdjustment = vi.fn();

vi.mock('@/hooks/useAdminUsers', () => ({
    useAddUserPayment: () => ({
        mutate: mutatePayment,
        isPending: false,
    }),
    useAdjustUserBalance: () => ({
        mutate: mutateAdjustment,
        isPending: false,
    }),
}));

vi.mock('@/components/admin/UserBalanceHistoryDialog', () => ({
    UserBalanceHistoryDialog: () => <div data-testid="balance-history-dialog" />,
}));

const mockUser: UserOut = {
    id: 5,
    full_name: 'Пётр Петров',
    email: 'petr@test.ru',
    role: 'user',
    is_active: true,
    status: 'Новый',
    balance: 1500,
    privacy_policy_accepted: true,
    terms_accepted: true,
    email_verified: true,
    created_at: '2026-01-01T00:00:00Z',
};

function renderDialog(props: Partial<Parameters<typeof UserPaymentDialog>[0]> = {}) {
    return render(
        <UserPaymentDialog
            user={mockUser}
            open
            onClose={vi.fn()}
            {...props}
        />,
    );
}

describe('UserPaymentDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('не рендерится без пользователя', () => {
        const { container } = renderDialog({ user: null });
        expect(container).toBeEmptyDOMElement();
    });

    it('показывает имя пользователя и текущий баланс', () => {
        renderDialog();
        expect(screen.getByText('Финансы')).toBeInTheDocument();
        expect(screen.getByText('Пётр Петров')).toBeInTheDocument();
        expect(screen.getAllByText(/1\s*500/i).length).toBeGreaterThan(0);
    });

    it('по умолчанию открыт режим пополнения', () => {
        renderDialog();
        expect(screen.getByRole('button', { name: /пополнить баланс/i })).toBeInTheDocument();
    });

    it('переключается в режим корректировки', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.click(screen.getByRole('button', { name: /корректировка/i }));

        expect(screen.getByText(/описание операции/i)).toBeInTheDocument();
    });

    it('кнопка сабмита задизейблена до заполнения обязательных полей', () => {
        renderDialog();
        expect(screen.getByRole('button', { name: /пополнить баланс/i })).toBeDisabled();
    });

    it('валидная форма корректировки вызывает mutate', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.click(screen.getByRole('button', { name: /корректировка/i }));
        await user.type(screen.getByLabelText(/сумма/i), '-250');
        await user.type(screen.getByLabelText(/описание операции/i), 'Штраф за просрочку');

        const submit = screen.getByRole('button', { name: /выполнить корректировку/i });
        await waitFor(() => expect(submit).toBeEnabled());
        await user.click(submit);

        await waitFor(() => {
            expect(mutateAdjustment).toHaveBeenCalledTimes(1);
        });
        const [payload] = mutateAdjustment.mock.calls[0];
        expect(payload.userId).toBe(5);
        expect(payload.data.amount).toBe(-250);
        expect(payload.data.description).toBe('Штраф за просрочку');
    });

    it('отрицательная сумма блокирует сабмит', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.type(screen.getByLabelText(/сумма/i), '-100');

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /пополнить баланс/i })).toBeDisabled();
        });
        expect(mutatePayment).not.toHaveBeenCalled();
    });
});
