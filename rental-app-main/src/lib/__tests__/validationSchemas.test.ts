// src/lib/__tests__/validationSchemas.test.ts
// Тесты zod-схем: вход/регистрация, создание резерва (валидация дат), промокод-схемы.

import { describe, it, expect } from 'vitest';
import {
    loginSchema,
    registerSchema,
    reservationCreateSchema,
} from '@/lib/validationSchemas';

describe('loginSchema', () => {
    it('пропускает корректные данные', () => {
        const res = loginSchema.safeParse({ email: 'a@b.ru', password: '123456' });
        expect(res.success).toBe(true);
    });

    it('требует валидный email', () => {
        const res = loginSchema.safeParse({ email: 'not-email', password: '123456' });
        expect(res.success).toBe(false);
    });

    it('требует пароль не короче 6 символов', () => {
        const res = loginSchema.safeParse({ email: 'a@b.ru', password: '12345' });
        expect(res.success).toBe(false);
    });

    it('требует непустой email', () => {
        const res = loginSchema.safeParse({ email: '', password: '123456' });
        expect(res.success).toBe(false);
    });

    it('сообщение об ошибке email', () => {
        const res = loginSchema.safeParse({ email: 'bad', password: '123456' });
        if (!res.success) {
            expect(res.error.issues[0].message).toBe('Некорректный email');
        }
    });
});

describe('registerSchema', () => {
    const valid = {
        email: 'a@b.ru',
        password: 'Password1',
        fullName: 'Иван Иванов',
        privacyPolicyAccepted: true,
        termsAccepted: true,
    };

    it('пропускает корректные данные', () => {
        const res = registerSchema.safeParse(valid);
        expect(res.success).toBe(true);
    });

    it('отклоняет пароль без заглавной буквы', () => {
        const res = registerSchema.safeParse({ ...valid, password: 'password1' });
        expect(res.success).toBe(false);
    });

    it('отклоняет пароль без цифры', () => {
        const res = registerSchema.safeParse({ ...valid, password: 'PasswordA' });
        expect(res.success).toBe(false);
    });

    it('отклоняет короткий пароль', () => {
        const res = registerSchema.safeParse({ ...valid, password: 'Pa1' });
        expect(res.success).toBe(false);
    });

    it('требует ФИО не короче 2 символов', () => {
        const res = registerSchema.safeParse({ ...valid, fullName: 'И' });
        expect(res.success).toBe(false);
    });

    it('требует принять политику конфиденциальности', () => {
        const res = registerSchema.safeParse({ ...valid, privacyPolicyAccepted: false });
        expect(res.success).toBe(false);
    });

    it('требует принять условия использования', () => {
        const res = registerSchema.safeParse({ ...valid, termsAccepted: false });
        expect(res.success).toBe(false);
    });

    it('отклоняет некорректный телефон', () => {
        const res = registerSchema.safeParse({ ...valid, phone: '123' });
        expect(res.success).toBe(false);
    });

    it('пропускает корректный российский телефон', () => {
        const res = registerSchema.safeParse({ ...valid, phone: '+7 (900) 123-45-67' });
        expect(res.success).toBe(true);
    });

    it('пустой телефон валиден (опциональное поле)', () => {
        const res = registerSchema.safeParse({ ...valid, phone: '' });
        expect(res.success).toBe(true);
    });

    it('отклоняет короткий telegram username', () => {
        const res = registerSchema.safeParse({ ...valid, telegram_username: 'abc' });
        expect(res.success).toBe(false);
    });

    it('пропускает корректный telegram username', () => {
        const res = registerSchema.safeParse({ ...valid, telegram_username: '@ivanov' });
        expect(res.success).toBe(true);
    });
});

describe('reservationCreateSchema — валидация дат', () => {
    const valid = {
        equipment_ids: [1, 2],
        start_date: '2026-09-10',
        end_date: '2026-09-12',
        selected_accessories: {},
    };

    it('пропускает корректный диапазон', () => {
        const res = reservationCreateSchema.safeParse(valid);
        expect(res.success).toBe(true);
    });

    it('отклоняет дату окончания раньше начала', () => {
        const res = reservationCreateSchema.safeParse({
            ...valid,
            start_date: '2026-09-12',
            end_date: '2026-09-10',
        });
        expect(res.success).toBe(false);
    });

    it('отклоняет одинаковые даты (окончание должно быть позже)', () => {
        const res = reservationCreateSchema.safeParse({
            ...valid,
            start_date: '2026-09-10',
            end_date: '2026-09-10',
        });
        expect(res.success).toBe(false);
    });

    it('отклоняет невалидный формат даты начала', () => {
        const res = reservationCreateSchema.safeParse({
            ...valid,
            start_date: '10.09.2026',
        });
        expect(res.success).toBe(false);
    });

    it('отклоняет несуществующую дату', () => {
        const res = reservationCreateSchema.safeParse({
            ...valid,
            end_date: '2026-02-30',
        });
        expect(res.success).toBe(false);
    });

    it('требует хотя бы одну единицу оборудования', () => {
        const res = reservationCreateSchema.safeParse({ ...valid, equipment_ids: [] });
        expect(res.success).toBe(false);
    });

    it('подставляет пустой объект аксессуаров по умолчанию', () => {
        const { selected_accessories: _omit, ...rest } = valid;
        const res = reservationCreateSchema.safeParse(rest);
        expect(res.success).toBe(true);
        if (res.success) {
            expect(res.data.selected_accessories).toEqual({});
        }
    });

    it('ошибка диапазона относится к полю end_date', () => {
        const res = reservationCreateSchema.safeParse({
            ...valid,
            start_date: '2026-09-12',
            end_date: '2026-09-10',
        });
        if (!res.success) {
            const paths = res.error.issues.map(i => i.path.join('.'));
            expect(paths).toContain('end_date');
        }
    });
});
