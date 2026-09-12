// src/components/admin/__tests__/AddEquipmentToRentalDialog.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEquipmentToRentalDialog from '@/components/admin/AddEquipmentToRentalDialog';
import type { AdminRentalOut } from '@/types/rental';
import type { Equipment } from '@/types/equipment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mutateAddEquipment = vi.fn();

vi.mock('@/hooks/useAdminRentals', () => ({
    useAddEquipmentToRental: () => ({
        mutate: mutateAddEquipment,
        isPending: false,
    }),
}));

const mockAllEquipment: Equipment[] = [
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
        name: 'Canon R5',
        brand: 'Canon',
        equipment_type: 'Камера',
        condition: 'good',
        daily_rate: 2500,
        accessories: [
            {
                id: 201,
                name: 'Аккумулятор LP-E6NH',
                accessory_type: 'Аккумулятор',
                price: 300,
            },
        ],
    },
    {
        id: 3,
        name: 'Aputure 300d II',
        brand: 'Aputure',
        equipment_type: 'Свет',
        condition: 'good',
        daily_rate: 1500,
        accessories: [],
    },
];

vi.mock('@/hooks/useAllEquipment', () => ({
    useAllEquipment: () => ({
        data: mockAllEquipment,
        isLoading: false,
    }),
}));

vi.mock('@/hooks/useAvailabilityCheck', () => ({
    useAvailabilityCheck: () => ({
        availabilityMap: {
            2: { status: 'available', is_available: true, equipment_id: 2, details: 'Доступно' },
            3: { status: 'reserved', is_available: false, equipment_id: 3, details: 'Занято' },
        },
        isLoading: false,
    }),
}));

const mockRental: AdminRentalOut = {
    id: 42,
    reservation_id: 12,
    user_id: 8,
    created_by_id: 1,
    status: 'active',
    start_date: '2026-09-10',
    end_date: '2026-09-15',
    total_cost: 6000,
    accessories_cost: 0,
    discount_amount: 0,
    prepayment_amount: 6000,
    remaining_amount: 0,
    deposit_amount: 0,
    overdue_surcharge: 0,
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-10T10:00:00Z',
    user: {
        id: 8,
        full_name: 'Анна Смирнова',
        email: 'anna@test.ru',
        balance: 5000,
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
        // Оборудование #1 уже в этой аренде
        mockAllEquipment[0],
    ],
    rental_items: [
        {
            rental_id: 42,
            equipment_id: 1,
            status: 'rented',
            actual_return_date: null,
            daily_rate: 2000,
        },
    ],
    accessory_links: [],
};

function renderDialog(props: Partial<Parameters<typeof AddEquipmentToRentalDialog>[0]> = {}) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <AddEquipmentToRentalDialog
                rental={mockRental}
                open
                onClose={vi.fn()}
                {...props}
            />
        </QueryClientProvider>
    );
}

describe('AddEquipmentToRentalDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('не рендерится без аренды', () => {
        const { container } = renderDialog({ rental: null });
        expect(container).toBeEmptyDOMElement();
    });

    it('отображает только оборудование, которого еще нет в аренде', () => {
        renderDialog();
        expect(screen.getByText(/Анна Смирнова/)).toBeInTheDocument();

        // Sony FX3 уже в аренде, поэтому не должен быть среди кандидатов
        expect(screen.queryByLabelText('Sony FX3')).not.toBeInTheDocument();

        // Canon R5 и Aputure 300d II должны быть в списке кандидатов
        expect(screen.getByLabelText('Canon R5')).toBeInTheDocument();
        expect(screen.getByLabelText('Aputure 300d II')).toBeInTheDocument();
    });

    it('дизейблит недоступные позиции', () => {
        renderDialog();

        // Canon R5 доступен
        const canonCheckbox = screen.getByLabelText('Canon R5');
        expect(canonCheckbox).not.toBeDisabled();
        expect(screen.getByText('Доступно')).toBeInTheDocument();

        // Aputure 300d II занят
        const aputureCheckbox = screen.getByLabelText('Aputure 300d II');
        expect(aputureCheckbox).toBeDisabled();
        expect(screen.getByText('Занято')).toBeInTheDocument();
    });

    it('позволяет выбрать доступное оборудование и сабмитит добор', async () => {
        const user = userEvent.setup();
        renderDialog();

        // Кнопка сабмита отключена, пока ничего не выбрано
        const submitBtn = screen.getByRole('button', { name: /Добавить в аренду/ });
        expect(submitBtn).toBeDisabled();

        // Выбираем Canon R5
        const canonCheckbox = screen.getByLabelText('Canon R5');
        await user.click(canonCheckbox);
        expect(canonCheckbox).toBeChecked();

        // При выборе появляются аксессуары оборудования
        expect(screen.getByLabelText('Аккумулятор LP-E6NH')).toBeInTheDocument();
        await user.click(screen.getByLabelText('Аккумулятор LP-E6NH'));

        // Кнопка становится активной
        expect(submitBtn).not.toBeDisabled();
        await user.click(submitBtn);

        expect(mutateAddEquipment).toHaveBeenCalledTimes(1);
        const callArgs = mutateAddEquipment.mock.calls[0][0];
        expect(callArgs.rentalId).toBe(42);
        expect(callArgs.data.equipment_ids).toEqual([2]);
        expect(callArgs.data.selected_accessories).toEqual({ 2: [201] });
    });
});
