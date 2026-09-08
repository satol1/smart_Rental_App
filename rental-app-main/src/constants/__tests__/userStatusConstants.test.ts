// src/constants/__tests__/userStatusConstants.test.ts

import { describe, it, expect } from 'vitest';
import {
    USER_STATUS,
    MAX_RESERVATIONS_BY_STATUS,
    EDIT_RESTRICTION_DAYS,
    RESERVATION_GRACE_PERIOD_HOURS,
    isInReservationGracePeriod,
    remainingGraceHours,
    canUserEditReservation,
    canUserCancelReservation,
    getMaxReservationsForStatus,
} from '../userStatusConstants';

describe('userStatusConstants', () => {
    describe('USER_STATUS', () => {
        it('должен содержать все необходимые статусы', () => {
            expect(USER_STATUS.NEW).toBe('Новый');
            expect(USER_STATUS.REGULAR).toBe('Постоянный');
            expect(USER_STATUS.VIP).toBe('VIP');
            expect(USER_STATUS.BLOCKED).toBe('Заблокирован');
            expect(USER_STATUS.PERSONA_NON_GRATA).toBe('Персона НонГрата');
        });
    });

    describe('MAX_RESERVATIONS_BY_STATUS', () => {
        it('должен содержать правильные лимиты для каждого статуса', () => {
            expect(MAX_RESERVATIONS_BY_STATUS[USER_STATUS.NEW]).toBe(2);
            expect(MAX_RESERVATIONS_BY_STATUS[USER_STATUS.REGULAR]).toBe(5);
            expect(MAX_RESERVATIONS_BY_STATUS[USER_STATUS.VIP]).toBe(10);
            expect(MAX_RESERVATIONS_BY_STATUS[USER_STATUS.BLOCKED]).toBe(0);
            expect(MAX_RESERVATIONS_BY_STATUS[USER_STATUS.PERSONA_NON_GRATA]).toBe(0);
        });
    });

    describe('EDIT_RESTRICTION_DAYS', () => {
        it('должен содержать правильные ограничения для каждого статуса', () => {
            expect(EDIT_RESTRICTION_DAYS[USER_STATUS.NEW]).toBe(2);
            expect(EDIT_RESTRICTION_DAYS[USER_STATUS.REGULAR]).toBe(1);
            expect(EDIT_RESTRICTION_DAYS[USER_STATUS.VIP]).toBe(0);
            expect(EDIT_RESTRICTION_DAYS[USER_STATUS.BLOCKED]).toBe(2);
            expect(EDIT_RESTRICTION_DAYS[USER_STATUS.PERSONA_NON_GRATA]).toBe(999);
        });
    });

    describe('canUserEditReservation', () => {
        it('должен возвращать false для null статуса', () => {
            expect(canUserEditReservation(null, 5)).toBe(false);
            expect(canUserEditReservation(undefined, 5)).toBe(false);
        });

        it('должен возвращать false для Персона НонГрата', () => {
            expect(canUserEditReservation(USER_STATUS.PERSONA_NON_GRATA, 10)).toBe(false);
            expect(canUserEditReservation(USER_STATUS.PERSONA_NON_GRATA, 1)).toBe(false);
        });

        it('должен возвращать true для VIP независимо от дней', () => {
            expect(canUserEditReservation(USER_STATUS.VIP, 0)).toBe(true);
            expect(canUserEditReservation(USER_STATUS.VIP, 1)).toBe(true);
            expect(canUserEditReservation(USER_STATUS.VIP, 10)).toBe(true);
        });

        it('должен проверять ограничения для Нового статуса', () => {
            // За 3 дня до начала - можно редактировать
            expect(canUserEditReservation(USER_STATUS.NEW, 3)).toBe(true);
            // За 2 дня до начала - нельзя редактировать
            expect(canUserEditReservation(USER_STATUS.NEW, 2)).toBe(false);
            expect(canUserEditReservation(USER_STATUS.NEW, 1)).toBe(false);
        });

        it('должен проверять ограничения для Постоянного статуса', () => {
            // За 2 дня до начала - можно редактировать
            expect(canUserEditReservation(USER_STATUS.REGULAR, 2)).toBe(true);
            // За 1 день до начала - нельзя редактировать
            expect(canUserEditReservation(USER_STATUS.REGULAR, 1)).toBe(false);
            expect(canUserEditReservation(USER_STATUS.REGULAR, 0)).toBe(false);
        });

        it('должен проверять ограничения для Заблокированного статуса', () => {
            // За 3 дня до начала - можно редактировать
            expect(canUserEditReservation(USER_STATUS.BLOCKED, 3)).toBe(true);
            // За 2 дня до начала - нельзя редактировать
            expect(canUserEditReservation(USER_STATUS.BLOCKED, 2)).toBe(false);
        });
    });

    describe('canUserCancelReservation', () => {
        it('должен использовать ту же логику что и canUserEditReservation', () => {
            expect(canUserCancelReservation(USER_STATUS.NEW, 3)).toBe(true);
            expect(canUserCancelReservation(USER_STATUS.NEW, 2)).toBe(false);
            expect(canUserCancelReservation(USER_STATUS.VIP, 0)).toBe(true);
            expect(canUserCancelReservation(USER_STATUS.PERSONA_NON_GRATA, 10)).toBe(false);
        });
    });

    describe('grace-период (24 ч после создания)', () => {
        it('константа синхронизирована с бэкендом', () => {
            expect(RESERVATION_GRACE_PERIOD_HOURS).toBe(24);
        });

        it('isInReservationGracePeriod: свежий резерв — да, старый/без даты — нет', () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
            expect(isInReservationGracePeriod(twoHoursAgo)).toBe(true);
            expect(isInReservationGracePeriod(twoDaysAgo)).toBe(false);
            expect(isInReservationGracePeriod(null)).toBe(false);
            expect(isInReservationGracePeriod(undefined)).toBe(false);
            expect(isInReservationGracePeriod('not-a-date')).toBe(false);
        });

        it('remainingGraceHours считает остаток', () => {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            expect(remainingGraceHours(oneHourAgo)).toBe(23);
            expect(remainingGraceHours(null)).toBe(0);
        });

        it('свежесозданный резерв можно отменить даже с близкой датой начала', () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            // «Новый» со стартом завтра: без grace нельзя, с grace можно
            expect(canUserCancelReservation(USER_STATUS.NEW, 1)).toBe(false);
            expect(canUserCancelReservation(USER_STATUS.NEW, 1, twoHoursAgo)).toBe(true);
            expect(canUserEditReservation(USER_STATUS.NEW, 0, twoHoursAgo)).toBe(true);
        });

        it('истёкший grace возвращает обычное правило', () => {
            const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
            expect(canUserCancelReservation(USER_STATUS.NEW, 1, twoDaysAgo)).toBe(false);
        });

        it('grace не помогает для прошедшей даты и Персоны Нон Грата', () => {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            expect(canUserEditReservation(USER_STATUS.NEW, -1, twoHoursAgo)).toBe(false);
            expect(canUserEditReservation(USER_STATUS.PERSONA_NON_GRATA, 1, twoHoursAgo)).toBe(false);
        });
    });

    describe('getMaxReservationsForStatus', () => {
        it('должен возвращать 0 для null или undefined', () => {
            expect(getMaxReservationsForStatus(null)).toBe(0);
            expect(getMaxReservationsForStatus(undefined)).toBe(0);
        });

        it('должен возвращать правильные лимиты для каждого статуса', () => {
            expect(getMaxReservationsForStatus(USER_STATUS.NEW)).toBe(2);
            expect(getMaxReservationsForStatus(USER_STATUS.REGULAR)).toBe(5);
            expect(getMaxReservationsForStatus(USER_STATUS.VIP)).toBe(10);
            expect(getMaxReservationsForStatus(USER_STATUS.BLOCKED)).toBe(0);
            expect(getMaxReservationsForStatus(USER_STATUS.PERSONA_NON_GRATA)).toBe(0);
        });
    });
});

