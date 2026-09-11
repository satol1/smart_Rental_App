import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinancialSummaryBlock from '../FinancialSummaryBlock';
import { formatMoney } from '@/lib/money';

const priceDetails = {
    day_count: 3, full_total: 9000, final_total: 7200, discount_amount: 1800,
    duration_discount_percentage: 10, promo_discount_percentage: 10,
};
const baseProps = { priceDetails, promoCode: '', setPromoCode: vi.fn(), applyPromoCode: vi.fn(), promoCodeValid: false };

describe('FinancialSummaryBlock checkout', () => {
    it('renders the server total and included accessories without adding them again', () => {
        const { container } = render(<FinancialSummaryBlock {...baseProps} accessoriesDailyTotal={100} />);
        expect(container.textContent).toContain(formatMoney(7200));
        expect(container.textContent).toContain(formatMoney(300));
        expect(screen.getAllByText('К оплате')).toHaveLength(1);
        expect(container.textContent).not.toContain(formatMoney(7500));
    });

    it('explains a disabled confirmation and allows submission once conflicts are resolved', async () => {
        const onSubmit = vi.fn();
        const { rerender } = render(<FinancialSummaryBlock {...baseProps} onSubmit={onSubmit} isFormValid={false} formInvalidReason="Измените даты резерва" />);
        const confirm = screen.getByRole('button', { name: 'Подтвердить резерв' });
        expect(confirm).toBeDisabled();
        expect(confirm).toHaveAccessibleDescription('Измените даты резерва');
        await userEvent.click(confirm);
        expect(onSubmit).not.toHaveBeenCalled();
        rerender(<FinancialSummaryBlock {...baseProps} onSubmit={onSubmit} isFormValid />);
        await userEvent.click(screen.getByRole('button', { name: 'Подтвердить резерв' }));
        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('blocks confirmation while availability or promotional pricing is being checked', () => {
        const { rerender } = render(<FinancialSummaryBlock {...baseProps} onSubmit={vi.fn()} isLoading />);
        expect(screen.getByRole('button', { name: 'Подтвердить резерв' })).toBeDisabled();
        expect(screen.getByRole('status')).toHaveTextContent('Рассчитываем стоимость');
        rerender(<FinancialSummaryBlock {...baseProps} onSubmit={vi.fn()} isApplyingPromoCode />);
        expect(screen.getByRole('button', { name: 'Подтвердить резерв' })).toBeDisabled();
    });
});
