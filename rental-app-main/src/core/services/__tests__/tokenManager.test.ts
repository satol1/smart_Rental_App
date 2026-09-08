// src/core/services/__tests__/tokenManager.test.ts
// Тесты in-memory хранилища access-токена.

import { describe, it, expect, beforeEach } from 'vitest';
import {
    getAccessToken,
    setAccessToken,
    clearAccessToken,
} from '../tokenManager';

describe('tokenManager', () => {
    beforeEach(() => {
        clearAccessToken();
    });

    it('изначально токен отсутствует', () => {
        expect(getAccessToken()).toBeNull();
    });

    it('setAccessToken сохраняет токен в памяти', () => {
        setAccessToken('abc123');
        expect(getAccessToken()).toBe('abc123');
    });

    it('setAccessToken перезаписывает предыдущий токен', () => {
        setAccessToken('first');
        setAccessToken('second');
        expect(getAccessToken()).toBe('second');
    });

    it('clearAccessToken очищает токен', () => {
        setAccessToken('abc123');
        clearAccessToken();
        expect(getAccessToken()).toBeNull();
    });

    it('setAccessToken(null) эквивалентен очистке', () => {
        setAccessToken('abc123');
        setAccessToken(null);
        expect(getAccessToken()).toBeNull();
    });

    it('токен не попадает в localStorage', () => {
        setAccessToken('secret-token');
        expect(localStorage.getItem('access_token')).toBeNull();
        expect(localStorage.length).toBe(0);
    });
});
