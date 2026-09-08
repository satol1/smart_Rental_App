// src/components/shared/__tests__/FinancialInfoBlock.test.tsx
// Тесты финансового блока (используется в карточках резервов).

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinancialInfoBlock from '@/components/shared/FinancialInfoBlock';
import { formatMoney } from '@/components/ui/money-text';

describe('FinancialInfoBlock', () => {
    it('показывает итоговую сумму', () => {
        const { container } = render(<FinancialInfoBlock totalCost={5000} />);
        expect(container.textContent).toContain(formatMoney(5000));
    });

    it('null-сумма отображается как Н/Д', () => {
        render(<FinancialInfoBlock totalCost={null} />);
        expect(screen.getByText('Н/Д')).toBeInTheDocument();
    });

    it('показывает скидку при наличии', () => {
        render(<FinancialInfoBlock totalCost={5000} discountAmount={700} />);
        expect(screen.getByText(/со скидкой/)).toBeInTheDocument();
        expect(screen.getByText(/со скидкой/).textContent).toContain('700');
    });

    it('не показывает скидку при нуле', () => {
        render(<FinancialInfoBlock totalCost={5000} discountAmount={0} />);
        expect(screen.queryByText(/со скидкой/)).not.toBeInTheDocument();
    });

    it('показывает промокод', () => {
        render(<FinancialInfoBlock totalCost={5000} promoCode="SAVE10" />);
        expect(screen.getByText('SAVE10')).toBeInTheDocument();
    });

    it('админский вариант показывает общую стоимость', () => {
        render(<FinancialInfoBlock totalCost={5000} variant="admin" />);
        expect(screen.getByText('Общая стоимость:')).toBeInTheDocument();
    });

    it('компактный вариант рендерит итог', () => {
        const { container } = render(<FinancialInfoBlock totalCost={1234} variant="compact" />);
        expect(screen.getByText('Итог:')).toBeInTheDocument();
        expect(container.textContent).toContain(formatMoney(1234));
    });
});
