import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReserveEquipmentCard from '../ReserveEquipmentCard';
import type { Equipment } from '@/types/equipment';
import { useReserveStore } from '@/store/reserveStore';

const equipment: Equipment = {
    id: 41, name: 'Sony A7 IV', brand: 'Sony', equipment_type: 'Камера', condition: 'Исправно', daily_rate: 2000,
    accessories: [{ id: 9, name: 'Аккумулятор NP-FZ100', accessory_type: 'Питание', price: 200 }],
};

describe('ReserveEquipmentCard', () => {
    afterEach(() => useReserveStore.getState().clear());

    it('preserves the catalog photograph when selected equipment reaches checkout', () => {
        useReserveStore.getState().toggle({ ...equipment, image_url: '/uploads/camera.jpg', image_urls: ['/uploads/camera.jpg'] });
        const selected = useReserveStore.getState().items[0];
        render(<ReserveEquipmentCard equipment={selected} onRemove={vi.fn()} isAccessorySelected={() => false} onToggleAccessory={vi.fn()} />);
        expect(screen.getByAltText('')).toHaveAttribute('src', '/uploads/camera.jpg');
        expect(selected.daily_rate).toBe(equipment.daily_rate);
        expect(selected.accessories).toEqual(equipment.accessories);
    });

    it('keeps accessory selection keyboard accessible and calls existing selection behavior', async () => {
        const onToggleAccessory = vi.fn();
        render(<ReserveEquipmentCard equipment={equipment} onRemove={vi.fn()} isAccessorySelected={() => false} onToggleAccessory={onToggleAccessory} />);
        const disclosure = screen.getByRole('button', { name: 'Аксессуары (1)' });
        expect(disclosure).toHaveAttribute('aria-expanded', 'false');
        disclosure.focus();
        await userEvent.keyboard('{Enter}');
        expect(disclosure).toHaveAttribute('aria-expanded', 'true');
        await userEvent.click(screen.getByRole('checkbox', { name: 'Аккумулятор NP-FZ100' }));
        expect(onToggleAccessory).toHaveBeenCalledWith(41, 9);
    });

    it('preserves conflict status and allows removing the specific equipment', async () => {
        const onRemove = vi.fn();
        render(<ReserveEquipmentCard equipment={equipment} availability={{ equipment_id: 41, details: '', status: 'reserved', start_date: '2026-10-01', end_date: '2026-10-04' }}
            onRemove={onRemove} isAccessorySelected={() => false} onToggleAccessory={vi.fn()} />);
        expect(screen.getByText('Занято другим резервом')).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Удалить Sony A7 IV из резерва' }));
        expect(onRemove).toHaveBeenCalledWith(41);
    });
});
