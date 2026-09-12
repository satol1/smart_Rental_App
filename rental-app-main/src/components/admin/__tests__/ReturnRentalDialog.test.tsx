// src/components/admin/__tests__/ReturnRentalDialog.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReturnRentalDialog from '@/components/admin/ReturnRentalDialog';
import type { AdminRentalOut } from '@/types/rental';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mutateReturn = vi.fn();
const mutatePaymentAsync = vi.fn();

vi.mock('@/hooks/useAdminRentals', () => ({
    useReturnRental: () => ({
        mutate: mutateReturn,
        isPending: false,
    }),
}));

vi.mock('@/hooks/useAdminUsers', () => ({
    useAddUserPayment: () => ({
        mutateAsync: mutatePaymentAsync,
        isPending: false,
    }),
}));

const mockRental: AdminRentalOut = {
    id: 101,
    reservation_id: 50,
    user_id: 7,
    created_by_id: 1,
    status: 'active',
    start_date: '2026-09-10',
    end_date: '2026-09-15',
    total_cost: 10000,
    accessories_cost: 0,
    discount_amount: 0,
    prepayment_amount: 5000,
    remaining_amount: 5000,
    deposit_amount: 3000,
    overdue_surcharge: 0,
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-10T10:00:00Z',
    user: {
        id: 7,
        full_name: 'Иван Иванов',
        email: 'ivan@test.ru',
        balance: 1000,
        role: 'user',
        is_active: true,
        status: 'Активный',
        privacy_policy_accepted: true,
        terms_accepted: true,
        email_verified: true,
        created_at: '2026-01-01T00:00:00Z',
    },
    created_by: {
        id: 1,
        full_name: 'Админ',
        email: 'admin@test.ru',
        balance: 0,
        role: 'admin',
        is_active: true,
        status: 'Активный',
        privacy_policy_accepted: true,
        terms_accepted: true,
        email_verified: true,
        created_at: '2026-01-01T00:00:00Z',
    },
    equipment: [
        {
            id: 1,
            name: 'Sony FX3',
            brand: 'Sony',
            equipment_type: 'Камера',
            condition: 'good',
            daily_rate: 2000,
            accessories: [],
        },
        {
            id: 2,
            name: 'Sony 24-70mm GM II',
            brand: 'Sony',
            equipment_type: 'Объектив',
            condition: 'good',
            daily_rate: 1000,
            accessories: [],
        },
    ],
    rental_items: [
        {
            rental_id: 101,
            equipment_id: 1,
            status: 'rented',
            actual_return_date: null,
            daily_rate: 2000,
        },
        {
            rental_id: 101,
            equipment_id: 2,
            status: 'rented',
            actual_return_date: null,
            daily_rate: 1000,
        },
    ],
    accessory_links: [
        {
            id: 1,
            rental_id: 101,
            equipment_id: 1,
            accessory: {
                id: 10,
                name: 'Аккумулятор NP-FZ100',
                accessory_type: 'battery',
                price: 800,
            },
        },
    ],
};

function renderDialog(props: Partial<Parameters<typeof ReturnRentalDialog>[0]> = {}) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <ReturnRentalDialog
                rental={mockRental}
                open
                onClose={vi.fn()}
                {...props}
            />
        </QueryClientProvider>
    );
}

describe('ReturnRentalDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('не рендерится без аренды', () => {
        const { container } = renderDialog({ rental: null });
        expect(container).toBeEmptyDOMElement();
    });

    it('отображает клиента, оборудование и по умолчанию выбирает все активные позиции', () => {
        renderDialog();
        expect(screen.getByText(/Иван Иванов/)).toBeInTheDocument();
        expect(screen.getByLabelText('Sony FX3')).toBeInTheDocument();
        expect(screen.getByLabelText('Sony 24-70mm GM II')).toBeInTheDocument();

        // По умолчанию обе галочки выбраны
        const eq1Checkbox = screen.getByLabelText('Sony FX3');
        const eq2Checkbox = screen.getByLabelText('Sony 24-70mm GM II');
        expect(eq1Checkbox).toBeChecked();
        expect(eq2Checkbox).toBeChecked();

        // Кнопка сабмита полного возврата
        expect(screen.getByRole('button', { name: 'Подтвердить возврат' })).toBeInTheDocument();
    });

    it('при снятии выбора с одной позиции переключается в режим частичного возврата', async () => {
        const user = userEvent.setup();
        renderDialog();

        const eq2Checkbox = screen.getByLabelText('Sony 24-70mm GM II');
        await user.click(eq2Checkbox);

        expect(eq2Checkbox).not.toBeChecked();

        // Появляется предупреждение о частичном возврате
        expect(screen.getByText(/Частичный возврат:/)).toBeInTheDocument();
        expect(screen.getByText(/будет возвращено 1 из 2 позиций/)).toBeInTheDocument();

        // Текст кнопки сабмита меняется
        expect(
            screen.getByRole('button', { name: /Оформить частичный возврат \(1\)/ })
        ).toBeInTheDocument();
    });

    it('сабмит частичного возврата передает выбранные equipment_ids', async () => {
        const user = userEvent.setup();
        renderDialog();

        // Снимаем выбор с оборудования 2
        await user.click(screen.getByLabelText('Sony 24-70mm GM II'));

        // Подтверждаем аксессуар для оставшегося выбранного оборудования 1
        const accessoryCheckbox = screen.getByLabelText('Аккумулятор NP-FZ100');
        await user.click(accessoryCheckbox);

        // Кликаем по кнопке частичного возврата
        const submitBtn = screen.getByRole('button', { name: /Оформить частичный возврат/ });
        await user.click(submitBtn);

        expect(mutateReturn).toHaveBeenCalledTimes(1);
        const callArgs = mutateReturn.mock.calls[0][0];
        expect(callArgs.rentalId).toBe(101);
        expect(callArgs.data.equipment_ids).toEqual([1]);
        expect(callArgs.data.accessories_returned_confirmation).toBe(true);
    });

    it('аксессуары не выбранного оборудования не отображаются в чеклисте', async () => {
        const user = userEvent.setup();
        renderDialog();

        // Изначально аксессуар для оборудования 1 виден
        expect(screen.getByLabelText('Аккумулятор NP-FZ100')).toBeInTheDocument();

        // Снимаем выбор с оборудования 1 (которому принадлежит аксессуар)
        await user.click(screen.getByLabelText('Sony FX3'));

        // Теперь аксессуар больше не запрашивается для подтверждения возврата
        expect(screen.queryByLabelText('Аккумулятор NP-FZ100')).not.toBeInTheDocument();
    });

    it('внесение платежа не отправляет преждевременных мутаций и передается в возврате', async () => {
        const user = userEvent.setup();
        renderDialog();

        const paymentInput = screen.getByPlaceholderText('Введите сумму');
        await user.type(paymentInput, '3000');

        const applyPaymentBtn = screen.getByRole('button', { name: 'Внести платеж' });
        await user.click(applyPaymentBtn);

        // Преждевременная мутация платежа в БД НЕ вызывается!
        expect(mutatePaymentAsync).not.toHaveBeenCalled();
        expect(screen.getByText(/Платеж будет внесен при подтверждении возврата/)).toBeInTheDocument();

        // Отмечаем аксессуары и сабмитим возврат
        const accessoryCheckbox = screen.getByLabelText('Аккумулятор NP-FZ100');
        await user.click(accessoryCheckbox);

        const submitBtn = screen.getByRole('button', { name: 'Подтвердить возврат' });
        await user.click(submitBtn);

        expect(mutateReturn).toHaveBeenCalledTimes(1);
        const callArgs = mutateReturn.mock.calls[0][0];
        expect(callArgs.rentalId).toBe(101);
        expect(callArgs.data.payment_amount).toBe(3000);
        expect(callArgs.data.payment_method).toBe('cash');
    });

    it('отображает блок управления залогом и по умолчанию возвращает залог', async () => {
        const user = userEvent.setup();
        renderDialog();

        expect(screen.getByText('Возврат / удержание залога')).toBeInTheDocument();
        expect(screen.getByText('Вернуть залог')).toBeInTheDocument();
        expect(screen.getByText('Удержать весь залог')).toBeInTheDocument();
        expect(screen.getByText('Частичный возврат')).toBeInTheDocument();

        // Отмечаем аксессуары и сабмитим
        const accessoryCheckbox = screen.getByLabelText('Аккумулятор NP-FZ100');
        await user.click(accessoryCheckbox);

        const submitBtn = screen.getByRole('button', { name: 'Подтвердить возврат' });
        await user.click(submitBtn);

        expect(mutateReturn).toHaveBeenCalledTimes(1);
        const callArgs = mutateReturn.mock.calls[0][0];
        expect(callArgs.data.deposit_action).toBe('refund');
        expect(callArgs.data.deposit_retained_amount).toBe(0);
    });

    it('позволяет выбрать удержание залога с указанием причины', async () => {
        const user = userEvent.setup();
        renderDialog();

        // Выбираем "Удержать весь залог"
        await user.click(screen.getByText('Удержать весь залог'));

        // Вводим причину
        const notesInput = screen.getByPlaceholderText('Например: скол на бленде, утеряна крышка');
        await user.type(notesInput, 'Поврежден байонет камеры');

        // Отмечаем аксессуары и сабмитим
        const accessoryCheckbox = screen.getByLabelText('Аккумулятор NP-FZ100');
        await user.click(accessoryCheckbox);

        const submitBtn = screen.getByRole('button', { name: 'Подтвердить возврат' });
        await user.click(submitBtn);

        expect(mutateReturn).toHaveBeenCalledTimes(1);
        const callArgs = mutateReturn.mock.calls[0][0];
        expect(callArgs.data.deposit_action).toBe('retain');
        expect(callArgs.data.deposit_retained_amount).toBe(3000);
        expect(callArgs.data.deposit_notes).toBe('Поврежден байонет камеры');
    });

    it('позволяет выбрать частичное удержание залога', async () => {
        const user = userEvent.setup();
        renderDialog();

        // Выбираем "Частичный возврат"
        await user.click(screen.getByText('Частичный возврат'));

        // Вводим сумму удержания
        const retainedInput = screen.getByPlaceholderText('Например: 1500');
        await user.type(retainedInput, '1200');

        // Отмечаем аксессуары и сабмитим
        const accessoryCheckbox = screen.getByLabelText('Аккумулятор NP-FZ100');
        await user.click(accessoryCheckbox);

        const submitBtn = screen.getByRole('button', { name: 'Подтвердить возврат' });
        await user.click(submitBtn);

        expect(mutateReturn).toHaveBeenCalledTimes(1);
        const callArgs = mutateReturn.mock.calls[0][0];
        expect(callArgs.data.deposit_action).toBe('partial_retain');
        expect(callArgs.data.deposit_retained_amount).toBe(1200);
    });

    it('кнопка "Выбрать все" отмечает все аксессуары возвращаемого оборудования', async () => {
        const user = userEvent.setup();
        renderDialog();

        const accessoryCheckbox = screen.getByLabelText('Аккумулятор NP-FZ100');
        expect(accessoryCheckbox).not.toBeChecked();

        // Кликаем "Выбрать все" в секции аксессуаров (вторая кнопка "Выбрать все")
        const selectAllButtons = screen.getAllByRole('button', { name: /Выбрать все/ });
        const selectAllAccBtn = selectAllButtons[selectAllButtons.length - 1];
        await user.click(selectAllAccBtn);

        expect(accessoryCheckbox).toBeChecked();
    });

    it('пометка аксессуара как "Утерян" начисляет стоимость и позволяет подтвердить возврат', async () => {
        const user = userEvent.setup();
        renderDialog();

        const accessoryCheckbox = screen.getByLabelText('Аккумулятор NP-FZ100');
        expect(accessoryCheckbox).not.toBeChecked();

        // Кнопка подтверждения возврата изначально заблокирована (аксессуар не подтвержден)
        const submitBtn = screen.getByRole('button', { name: 'Подтвердить возврат' });
        expect(submitBtn).toBeDisabled();

        // Помечаем аксессуар как утерянный
        const markLostBtn = screen.getByRole('button', { name: 'Пометить как утерян' });
        await user.click(markLostBtn);

        // Появляется индикатор утери и кнопка статуса утери
        expect(screen.getByText(/Утеряно аксессуаров: 1 шт/)).toBeInTheDocument();
        const lostStatusBtn = screen.getByRole('button', { name: /Утерян \(/ });
        expect(lostStatusBtn).toBeInTheDocument();

        // Теперь кнопка сабмита разблокирована
        expect(submitBtn).not.toBeDisabled();

        // Сабмитим возврат
        await user.click(submitBtn);

        expect(mutateReturn).toHaveBeenCalledTimes(1);
        const callArgs = mutateReturn.mock.calls[0][0];
        expect(callArgs.data.accessories_returned_confirmation).toBe(true);
        expect(callArgs.data.lost_accessory_ids).toEqual([10]);
        expect(callArgs.data.lost_accessories_cost).toBe(800);
        expect(callArgs.data.notes_on_return).toContain('Утерянные аксессуары');
    });

    it('отображает предупреждающий индикатор долга при наличии задолженности', () => {
        renderDialog();

        // Так как remaining_amount = 5000, должен отображаться индикатор задолженности
        expect(screen.getByTestId('debt-warning-indicator')).toBeInTheDocument();
        expect(screen.getByText(/Внимание: возврат будет оформлен с задолженностью!/)).toBeInTheDocument();
        expect(screen.getByText(/completed_with_debt/)).toBeInTheDocument();
    });

    it('при снятии выбора с оборудования утерянные для него аксессуары не начисляются', async () => {
        const user = userEvent.setup();
        renderDialog();

        // Помечаем аксессуар оборудования 1 как утерянный
        const markLostBtn = screen.getByRole('button', { name: 'Пометить как утерян' });
        await user.click(markLostBtn);
        expect(screen.getByText(/Утеряно аксессуаров: 1 шт/)).toBeInTheDocument();

        // Снимаем выбор с оборудования 1 (остается только оборудование 2)
        const eq1Checkbox = screen.getByLabelText('Sony FX3');
        await user.click(eq1Checkbox);

        // Индикатор утери аксессуаров скрывается, так как оборудование 1 не возвращается
        expect(screen.queryByText(/Утеряно аксессуаров:/)).not.toBeInTheDocument();

        // Сабмитим частичный возврат оборудования 2
        const submitBtn = screen.getByRole('button', { name: /Оформить частичный возврат \(1\)/ });
        await user.click(submitBtn);

        expect(mutateReturn).toHaveBeenCalledTimes(1);
        const callArgs = mutateReturn.mock.calls[0][0];
        expect(callArgs.data.equipment_ids).toEqual([2]);
        expect(callArgs.data.lost_accessory_ids).toBeUndefined();
        expect(callArgs.data.lost_accessories_cost).toBeUndefined();
    });
});
