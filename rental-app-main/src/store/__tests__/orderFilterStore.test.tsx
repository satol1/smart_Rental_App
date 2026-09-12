// src/store/__tests__/orderFilterStore.test.tsx
// Регрессионный тест блокера этапа 5: замыкания в useShallow-селекторе
// зацикливали useSyncExternalStore (React 19, Maximum update depth exceeded).
// Рендерим хук БЕЗ моков — если цикл вернётся, тест упадёт по watchdog-таймауту.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useOrderFilters, useOrderFilterStore, type OrderContext } from '@/store/orderFilterStore';

vi.setConfig({ testTimeout: 10_000 });

function Probe({ context }: { context: OrderContext }) {
    const {
        searchQuery, statusFilter, sortOption, periodType, periodOffset,
        setSearchQuery, setStatusFilter,
    } = useOrderFilters(context);

    return (
        <div>
            <output data-testid="slice">
                {searchQuery}|{statusFilter}|{sortOption}|{String(periodType)}|{periodOffset}
            </output>
            <button onClick={() => setSearchQuery('запрос')}>setSearch</button>
            <button onClick={() => setStatusFilter('all')}>setStatus</button>
        </div>
    );
}

describe('useOrderFilters', () => {
    beforeEach(() => {
        // Возврат к исходному состоянию между тестами
        useOrderFilterStore.setState({
            contexts: {
                'user-reservations': { searchQuery: '', statusFilter: 'hide-completed', sortOption: 'id_desc', periodType: null, periodOffset: 0 },
                'user-rentals': { searchQuery: '', statusFilter: 'hide-completed', sortOption: 'id_desc', periodType: null, periodOffset: 0 },
                'admin-reservations': { searchQuery: '', statusFilter: 'active', sortOption: 'id_desc', periodType: null, periodOffset: 0 },
                'admin-rentals': { searchQuery: '', statusFilter: 'active', sortOption: 'id_desc', periodType: null, periodOffset: 0 },
            },
        });
    });

    it('рендерится без бесконечного цикла ре-рендеров (React 19 + useShallow)', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        try {
            render(<Probe context="user-reservations" />);
            expect(screen.getByTestId('slice').textContent).toContain('hide-completed');
            // Если бы селектор зацикливался, React выбросил бы Maximum update depth —
            // render бы упал или warnings заполнили бы консоль
            const depthErrors = errorSpy.mock.calls.filter(([msg]) =>
                String(msg).includes('Maximum update depth'),
            );
            expect(depthErrors).toHaveLength(0);
        } finally {
            errorSpy.mockRestore();
        }
    });

    it('действия меняют только свой контекст (изоляция срезов)', async () => {
        const { userEvent } = await import('@testing-library/user-event');
        const user = userEvent.setup();

        const { unmount } = render(<Probe context="user-reservations" />);
        await user.click(screen.getByRole('button', { name: 'setSearch' }));
        expect(screen.getByTestId('slice').textContent).toContain('запрос');
        unmount();

        render(<Probe context="admin-reservations" />);
        // Поиск из пользовательского контекста не протёк в админский
        expect(screen.getByTestId('slice').textContent).toContain('|');
        expect(screen.getByTestId('slice').textContent).not.toContain('запрос');
    });
});
