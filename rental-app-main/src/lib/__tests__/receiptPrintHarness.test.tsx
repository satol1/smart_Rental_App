// TEMPORARY harness test — renders the rental receipt and dumps DOM for print verification.
import { render } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import RentalReceipt from '@/components/admin/RentalReceipt';
import type { AdminRentalOut } from '@/types/rental';

vi.mock('@/components/shared/BrandLogo', () => ({
    default: ({ size }: { size?: number }) => (
        <svg data-testid="brand-logo" width={size} height={size} viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>
    ),
}));

const mockRental = {
    id: 123,
    status: 'active',
    start_date: '2026-02-20',
    end_date: '2026-02-25',
    created_at: '2026-02-19T14:30:00',
    total_cost: 15000,
    discount_amount: 1500,
    promo_code: 'PROMO10',
    final_cost: 13500,
    deposit_amount: 5000,
    prepayment_amount: 6000,
    accessories_cost: 500,
    remaining_amount: 7500,
    user: {
        id: 7,
        full_name: 'Иванов Иван Иванович',
        email: 'ivanov@example.ru',
        phone: '+7 (900) 123-45-67',
    },
    created_by: { id: 1, full_name: 'Менеджер', email: 'm@d.ru', phone: '+7' },
    equipment: [
        { id: 1, name: 'A7 IV', brand: 'Sony', serial_number: 'SN-001', equipment_type: 'camera', condition: 'good', daily_rate: 3000, accessories: [] },
        { id: 2, name: 'FE 24-70mm f/2.8', brand: 'Sony', serial_number: 'SN-002', equipment_type: 'lens', condition: 'good', daily_rate: 1500, accessories: [] },
        { id: 3, name: 'RS 3 Pro', brand: 'DJI', serial_number: '', equipment_type: 'gimbal', condition: 'good', daily_rate: 2000, accessories: [] },
    ],
    accessory_links: [
        { equipment_id: 1, accessory: { id: 11, name: 'Аккумулятор NP-FZ100' } },
        { equipment_id: 1, accessory: { id: 12, name: 'Карта памяти 128GB' } },
    ],
} as unknown as AdminRentalOut;

describe('RentalReceipt harness', () => {
    it('renders all sections and dumps DOM', () => {
        const { container } = render(<RentalReceipt rentalData={mockRental} />);
        const html = container.innerHTML;

        expect(container.querySelector('.print-container')).toBeTruthy();
        expect(container.querySelector('.receipt-header')).toBeTruthy();
        expect(container.querySelector('.receipt-contacts')).toBeTruthy();
        expect(container.querySelector('.receipt-title')).toBeTruthy();
        expect(container.querySelector('.receipt-client-info')).toBeTruthy();
        expect(container.querySelector('.receipt-details')).toBeTruthy();
        expect(container.querySelector('.receipt-equipment-table table')).toBeTruthy();
        expect(container.querySelector('.receipt-financials')).toBeTruthy();
        expect(container.querySelector('.receipt-rules')).toBeTruthy();
        expect(container.querySelector('.receipt-return-info')).toBeTruthy();
        expect(container.querySelector('.receipt-deposit')).toBeTruthy();
        expect(container.querySelector('.receipt-signatures')).toBeTruthy();
        expect(container.querySelectorAll('.receipt-sign-line').length).toBe(5);
        expect(html).toContain('БЛАНК АРЕНДЫ №123');
        expect(html).toContain('Иванов Иван Иванович');
        expect(html).toContain('Аккумулятор NP-FZ100');
        expect(html).toContain('М.П.');
        expect(html).toContain('Оборудование получил в исправном состоянии');
        expect(html).toContain('ИП Садомцев Анатолий Юрьевич');
        expect(html).toContain('+7 (8512) 39-28-88');
        expect(html).toContain('392888@digital30.ru');

        writeFileSync('src/lib/__tests__/.receipt-dom.tmp.html', html, 'utf-8');
    });
});
