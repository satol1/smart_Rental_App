// src/components/admin/__tests__/ConvertReservationDialog.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConvertReservationDialog from '@/components/admin/ConvertReservationDialog';
import type { AdminReservationOut } from '@/types/reservation';
import type { Equipment } from '@/types/equipment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';

const mutateAsyncConvert = vi.fn();

vi.mock('@/hooks/useAdminRentals', () => ({
    useConvertReservationToRental: () => ({
        mutateAsync: mutateAsyncConvert,
        isPending: false,
    }),
}));

vi.mock('@/hooks/useAvailabilityCheck', () => ({
    useAvailabilityCheck: () => ({
        hasConflicts: false,
        conflictingItemIds: [],
        isLoading: false,
    }),
}));

vi.mock('@/hooks/reservation/usePriceCalculator', () => ({
    usePriceCalculator: () => ({
        data: {
            final_total: 5000,
            discount_amount: 0,
            duration_discount_percentage: 0,
            promo_discount_percentage: 0,
        },
        isFetching: false,
        error: null,
    }),
}));

const mockReservation: AdminReservationOut = {
    id: 42,
    user_id: 10,
    status: 'active',
    start_date: '2026-10-15',
    end_date: '2026-10-20',
    total_cost: 5000,
    discount_amount: 0,
    accessories_cost: 0,
    remaining_amount: 5000,
    equipment_ids: [1],
    selected_accessories: {},
    created_at: '2026-09-01T10:00:00Z',
    user_info: {
        id: 10,
        full_name: 'Петр Петров',
        email: 'petr@test.ru',
        phone: '+79991234567',
        balance: 10000,
        role: 'user',
        is_active: true,
        status: 'active',
        privacy_policy_accepted: true,
        terms_accepted: true,
        email_verified: true,
        created_at: '2026-01-01T00:00:00Z',
    },
};

const mockEquipmentMap = new Map<number, Equipment>([
    [
        1,
        {
            id: 1,
            name: 'Sony FX3',
            brand: 'Sony',
            equipment_type: 'Камера',
            condition: 'good',
            daily_rate: 1000,
            accessories: [],
        },
    ],
]);

function renderWithClient(ui: React.ReactElement) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ConvertReservationDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('рендерит имя клиента и данные брони', () => {
        renderWithClient(
            <ConvertReservationDialog
                reservation={mockReservation}
                open={true}
                onClose={vi.fn()}
                equipmentMap={mockEquipmentMap}
            />
        );

        expect(screen.getByText('Выдача аренды из резерва #42')).toBeInTheDocument();
        expect(screen.getByText('Петр Петров')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Подтвердить и выдать/i })).toBeInTheDocument();
    });

    it('отображает кнопки выбора режима дат, если дата брони не совпадает с сегодня', () => {
        renderWithClient(
            <ConvertReservationDialog
                reservation={mockReservation}
                open={true}
                onClose={vi.fn()}
                equipmentMap={mockEquipmentMap}
            />
        );

        expect(screen.getByRole('button', { name: /Выдать сегодня/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Даты брони/i })).toBeInTheDocument();
    });

    it('по умолчанию отправляет today в качестве start_date при подтверждении', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        mutateAsyncConvert.mockResolvedValueOnce({ id: 99 });

        renderWithClient(
            <ConvertReservationDialog
                reservation={mockReservation}
                open={true}
                onClose={onClose}
                equipmentMap={mockEquipmentMap}
            />
        );

        const submitBtn = screen.getByRole('button', { name: /Подтвердить и выдать/i });
        await user.click(submitBtn);

        const todayStr = formatDate(new Date());
        expect(mutateAsyncConvert).toHaveBeenCalledWith({
            reservationId: 42,
            data: {
                start_date: todayStr,
                end_date: '2026-10-20',
                notes_on_issue: '',
                deposit_amount: 0,
                prepayment_amount: 0,
                force_issue_on_holiday: false,
            },
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('при переключении на "Даты брони" отправляет оригинальные даты бронирования', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        mutateAsyncConvert.mockResolvedValueOnce({ id: 99 });

        renderWithClient(
            <ConvertReservationDialog
                reservation={mockReservation}
                open={true}
                onClose={onClose}
                equipmentMap={mockEquipmentMap}
            />
        );

        const contractBtn = screen.getByRole('button', { name: /Даты брони/i });
        await user.click(contractBtn);

        const submitBtn = screen.getByRole('button', { name: /Подтвердить и выдать/i });
        await user.click(submitBtn);

        expect(mutateAsyncConvert).toHaveBeenCalledWith({
            reservationId: 42,
            data: {
                start_date: '2026-10-15',
                end_date: '2026-10-20',
                notes_on_issue: '',
                deposit_amount: 0,
                prepayment_amount: 0,
                force_issue_on_holiday: false,
            },
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('обрабатывает ошибку ISSUE_ON_HOLIDAY и позволяет форсировать выдачу', async () => {
        const user = userEvent.setup();
        const holidayError = {
            response: {
                status: 409,
                data: {
                    detail: {
                        error_type: 'ISSUE_ON_HOLIDAY',
                        message: 'Выбранный день является праздничным!',
                    },
                },
            },
        };
        mutateAsyncConvert.mockRejectedValueOnce(holidayError);

        renderWithClient(
            <ConvertReservationDialog
                reservation={mockReservation}
                open={true}
                onClose={vi.fn()}
                equipmentMap={mockEquipmentMap}
            />
        );

        const submitBtn = screen.getByRole('button', { name: /Подтвердить и выдать/i });
        await user.click(submitBtn);

        // Появился диалог подтверждения
        expect(await screen.findByText('Подтверждение выдачи')).toBeInTheDocument();
        expect(screen.getByText('Выбранный день является праздничным!')).toBeInTheDocument();

        // Кликаем "Да, выдать"
        mutateAsyncConvert.mockResolvedValueOnce({ id: 100 });
        const confirmBtn = screen.getByRole('button', { name: /Да, выдать/i });
        await user.click(confirmBtn);

        expect(mutateAsyncConvert).toHaveBeenLastCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    force_issue_on_holiday: true,
                }),
            })
        );
    });
});
