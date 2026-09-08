import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ui/__tests__/money-text.test.tsx
// Тесты MoneyText / formatMoney: единый формат рублей через Intl.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MoneyText, formatMoney } from '@/components/ui/money-text';
describe('formatMoney', () => {
    it('форматирует целую сумму в рублях', () => {
        expect(formatMoney(1234)).toMatch(/1\u00a0234/);
        expect(formatMoney(1234)).toContain('₽');
    });
    it('не показывает копейки по умолчанию', () => {
        expect(formatMoney(1234.56)).not.toContain(',');
        expect(formatMoney(1234.56)).not.toContain('.56');
    });
    it('withKopecks=true показывает копейки', () => {
        expect(formatMoney(1234.56, true)).toContain(',');
        expect(formatMoney(1234.56, true)).toContain('56');
    });
    it('null и undefined форматируются как 0 ₽', () => {
        expect(formatMoney(null)).toBe(formatMoney(0));
        expect(formatMoney(undefined)).toBe(formatMoney(0));
    });
    it('NaN форматируется как 0 ₽', () => {
        expect(formatMoney(Number.NaN)).toBe(formatMoney(0));
    });
    it('отрицательные суммы сохраняют знак', () => {
        expect(formatMoney(-500)).toContain('-');
        expect(formatMoney(-500)).toContain('500');
    });
    it('нулевая сумма содержит 0', () => {
        expect(formatMoney(0)).toContain('0');
    });
});
describe('MoneyText', () => {
    it('рендерит отформатированную сумму', () => {
        const { container } = render(_jsx(MoneyText, { value: 1500 }));
        expect(container.firstChild?.textContent).toBe(formatMoney(1500));
    });
    it('рендерит сумму с копейками при withKopecks', () => {
        const { container } = render(_jsx(MoneyText, { value: 1500.5, withKopecks: true }));
        expect(container.firstChild?.textContent).toBe(formatMoney(1500.5, true));
    });
    it('null рендерится как 0 ₽', () => {
        const { container } = render(_jsx(MoneyText, { value: null }));
        expect(container.firstChild?.textContent).toBe(formatMoney(0));
    });
    it('применяет переданный className', () => {
        const { container } = render(_jsx(MoneyText, { value: 10, className: "font-bold" }));
        expect(container.firstChild).toHaveClass('font-bold');
        expect(container.firstChild).toHaveClass('whitespace-nowrap');
    });
    it('рендерит большие суммы с разделителями групп', () => {
        const { container } = render(_jsx(MoneyText, { value: 1234567 }));
        expect(container.firstChild?.textContent).toBe(formatMoney(1234567));
        expect(container.firstChild?.textContent).toMatch(/1[\s\u00a0]234[\s\u00a0]567/);
    });
});
