// src/constants/__tests__/statusConstants.test.ts
// Тесты конфигурации статусов заказов и маппинга legacy-статусов пользователя.

import { describe, it, expect } from 'vitest';
import { STATUS_CONFIG, type OrderStatus } from '@/constants/statusConstants';
import { mapLegacyUserStatus, USER_STATUS } from '@/constants/userStatusConstants';

const ALL_ORDER_STATUSES: OrderStatus[] = [
    'active',
    'completed',
    'overdue',
    'fulfilled',
    'cancelled',
    'completed_with_debt',
];

describe('STATUS_CONFIG', () => {
    it('содержит все статусы заказов', () => {
        for (const status of ALL_ORDER_STATUSES) {
            expect(STATUS_CONFIG[status]).toBeDefined();
        }
    });

    it.each(ALL_ORDER_STATUSES)('статус %s имеет русский текст', (status) => {
        expect(STATUS_CONFIG[status].text.length).toBeGreaterThan(2);
    });

    it.each(ALL_ORDER_STATUSES)('статус %s имеет иконку', (status) => {
        expect(STATUS_CONFIG[status].Icon).toBeDefined();
    });

    it.each(ALL_ORDER_STATUSES)('статус %s имеет классы бейджа', (status) => {
        expect(STATUS_CONFIG[status].badgeClass).toContain('bg-');
    });

    it('активный статус — «Активен»', () => {
        expect(STATUS_CONFIG.active.text).toBe('Активен');
    });

    it('просроченный статус — «Просрочен»', () => {
        expect(STATUS_CONFIG.overdue.text).toBe('Просрочен');
    });

    it('выданный статус — «Выдан в аренду»', () => {
        expect(STATUS_CONFIG.fulfilled.text).toBe('Выдан в аренду');
    });
});

describe('mapLegacyUserStatus', () => {
    it('валидные статусы возвращаются как есть', () => {
        expect(mapLegacyUserStatus(USER_STATUS.VIP)).toBe(USER_STATUS.VIP);
        expect(mapLegacyUserStatus(USER_STATUS.BLOCKED)).toBe(USER_STATUS.BLOCKED);
    });

    it('null/undefined дают null', () => {
        expect(mapLegacyUserStatus(null)).toBeNull();
        expect(mapLegacyUserStatus(undefined)).toBeNull();
    });

    it('легаси-статус «Активный» маппится на «Новый»', () => {
        expect(mapLegacyUserStatus('Активный')).toBe(USER_STATUS.NEW);
    });

    it('легаси-статус «Требует подтверждения» маппится на «Новый»', () => {
        expect(mapLegacyUserStatus('Требует подтверждения')).toBe(USER_STATUS.NEW);
    });

    it('неизвестный статус даёт null', () => {
        expect(mapLegacyUserStatus('Супер-гость')).toBeNull();
    });
});
