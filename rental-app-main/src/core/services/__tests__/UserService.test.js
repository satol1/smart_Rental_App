// src/core/services/__tests__/UserService.test.ts
import { describe, it, expect } from 'vitest';
import { UserService } from '../UserService';
import { USER_STATUS } from '@/constants/userStatusConstants';
describe('UserService', () => {
    const createMockUser = (status) => ({
        id: 1,
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        is_active: true,
        status: status || null,
        privacy_policy_accepted: true,
        terms_accepted: true,
        email_verified: true,
        created_at: '2024-01-01T00:00:00Z',
    });
    describe('isPersonaNonGrata', () => {
        it('должен возвращать true для пользователя со статусом Персона НонГрата', () => {
            const user = createMockUser(USER_STATUS.PERSONA_NON_GRATA);
            expect(UserService.isPersonaNonGrata(user)).toBe(true);
        });
        it('должен возвращать false для пользователя с другим статусом', () => {
            const user = createMockUser(USER_STATUS.NEW);
            expect(UserService.isPersonaNonGrata(user)).toBe(false);
        });
        it('должен возвращать false для null или undefined', () => {
            expect(UserService.isPersonaNonGrata(null)).toBe(false);
            expect(UserService.isPersonaNonGrata(undefined)).toBe(false);
        });
    });
    describe('isBlocked', () => {
        it('должен возвращать true для пользователя со статусом Заблокирован', () => {
            const user = createMockUser(USER_STATUS.BLOCKED);
            expect(UserService.isBlocked(user)).toBe(true);
        });
        it('должен возвращать false для пользователя с другим статусом', () => {
            const user = createMockUser(USER_STATUS.NEW);
            expect(UserService.isBlocked(user)).toBe(false);
        });
        it('должен возвращать false для null или undefined', () => {
            expect(UserService.isBlocked(null)).toBe(false);
            expect(UserService.isBlocked(undefined)).toBe(false);
        });
    });
    describe('canCreateReservations', () => {
        it('должен возвращать false для null или undefined', () => {
            expect(UserService.canCreateReservations(null)).toBe(false);
            expect(UserService.canCreateReservations(undefined)).toBe(false);
        });
        it('должен возвращать false для Персона НонГрата', () => {
            const user = createMockUser(USER_STATUS.PERSONA_NON_GRATA);
            expect(UserService.canCreateReservations(user)).toBe(false);
        });
        it('должен возвращать false для Заблокированного', () => {
            const user = createMockUser(USER_STATUS.BLOCKED);
            expect(UserService.canCreateReservations(user)).toBe(false);
        });
        it('должен возвращать true для Нового статуса', () => {
            const user = createMockUser(USER_STATUS.NEW);
            expect(UserService.canCreateReservations(user)).toBe(true);
        });
        it('должен возвращать true для Постоянного статуса', () => {
            const user = createMockUser(USER_STATUS.REGULAR);
            expect(UserService.canCreateReservations(user)).toBe(true);
        });
        it('должен возвращать true для VIP статуса', () => {
            const user = createMockUser(USER_STATUS.VIP);
            expect(UserService.canCreateReservations(user)).toBe(true);
        });
    });
});
