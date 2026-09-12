// src/lib/__tests__/balanceUtils.test.ts
// Тесты утилит баланса (теперь формат делегируется formatMoney).

import { describe, it, expect } from 'vitest';
import {
    formatBalance,
    getBalanceColor,
    getBalanceValue,
    isNegativeBalance,
} from '@/lib/balanceUtils';
import { formatMoney } from '@/lib/money';

describe('formatBalance', () => {
    it('совместим с единым форматом formatMoney', () => {
        expect(formatBalance(1500)).toBe(formatMoney(1500));
    });

    it('содержит символ рубля', () => {
        expect(formatBalance(100)).toContain('₽');
    });

    it('null форматируется как ноль', () => {
        expect(formatBalance(null)).toBe(formatMoney(0));
    });

    it('undefined форматируется как ноль', () => {
        expect(formatBalance(undefined)).toBe(formatMoney(0));
    });
});

describe('getBalanceColor', () => {
    it('отрицательный баланс — красный', () => {
        expect(getBalanceColor(-100)).toBe('text-destructive');
    });

    it('положительный баланс — зелёный', () => {
        expect(getBalanceColor(100)).toBe('text-success');
    });

    it('нулевой баланс — зелёный', () => {
        expect(getBalanceColor(0)).toBe('text-success');
    });

    it('null трактуется как 0', () => {
        expect(getBalanceColor(null)).toBe('text-success');
    });
});

describe('getBalanceValue / isNegativeBalance', () => {
    it('getBalanceValue извлекает число', () => {
        expect(getBalanceValue(250)).toBe(250);
    });

    it('getBalanceValue для null/undefined даёт 0', () => {
        expect(getBalanceValue(null)).toBe(0);
        expect(getBalanceValue(undefined)).toBe(0);
    });

    it('isNegativeBalance определяет отрицательный баланс', () => {
        expect(isNegativeBalance(-1)).toBe(true);
        expect(isNegativeBalance(1)).toBe(false);
        expect(isNegativeBalance(0)).toBe(false);
        expect(isNegativeBalance(null)).toBe(false);
    });
});
