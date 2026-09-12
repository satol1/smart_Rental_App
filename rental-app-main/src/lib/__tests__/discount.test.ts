// src/lib/__tests__/discount.test.ts
// Финансовая математика скидок: потолок 75% обязан зеркалить бэкенд
// (validate_combined_discount в RentalApp_FASTAPI/shared/constants/constants.py).

import { describe, it, expect } from 'vitest';
import { combinedDiscountPercentage, MAX_COMBINED_DISCOUNT_PERCENT } from '@/constants/discount';

describe('combinedDiscountPercentage', () => {
    it('складывает скидки ниже потолка', () => {
        expect(combinedDiscountPercentage(10, 15)).toBe(25);
        expect(combinedDiscountPercentage(0, 30)).toBe(30);
        expect(combinedDiscountPercentage(20, 0)).toBe(20);
    });

    it('режет сумму на потолке 75%', () => {
        expect(combinedDiscountPercentage(50, 25)).toBe(75);
        expect(combinedDiscountPercentage(60, 30)).toBe(75);
        expect(combinedDiscountPercentage(70, 20)).toBe(75);
    });

    it('не меняет значение ровно на потолке', () => {
        expect(combinedDiscountPercentage(40, 35)).toBe(75);
        expect(combinedDiscountPercentage(75, 0)).toBe(75);
    });

    it('работает с нулями', () => {
        expect(combinedDiscountPercentage(0, 0)).toBe(0);
    });

    it('экспортирует потолок 75 (синхронизирован с бэкендом)', () => {
        expect(MAX_COMBINED_DISCOUNT_PERCENT).toBe(75);
    });
});
