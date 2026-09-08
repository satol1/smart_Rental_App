// src/core/services/__tests__/cookieConsentManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getCookieConsent, hasCookieConsent, setCookieConsent, shouldShowCookieBanner } from '../cookieConsentManager';
describe('cookieConsentManager', () => {
    // Очищаем localStorage перед каждым тестом
    beforeEach(() => {
        localStorage.clear();
    });
    describe('getCookieConsent', () => {
        it('должен возвращать null если согласие еще не было запрошено', () => {
            expect(getCookieConsent()).toBeNull();
        });
        it('должен возвращать true если согласие дано', () => {
            localStorage.setItem('cookie_consent_accepted', 'true');
            expect(getCookieConsent()).toBe(true);
        });
        it('должен возвращать false если в localStorage значение false (старое значение)', () => {
            // Для обратной совместимости: если в localStorage было false, функция вернет false
            localStorage.setItem('cookie_consent_accepted', 'false');
            expect(getCookieConsent()).toBe(false);
        });
    });
    describe('hasCookieConsent', () => {
        it('должен возвращать false если согласие не дано', () => {
            expect(hasCookieConsent()).toBe(false);
        });
        it('должен возвращать false если согласие не дано (null)', () => {
            expect(hasCookieConsent()).toBe(false);
        });
        it('должен возвращать false если в localStorage значение false (старое значение)', () => {
            localStorage.setItem('cookie_consent_accepted', 'false');
            expect(hasCookieConsent()).toBe(false);
        });
        it('должен возвращать true если согласие дано', () => {
            localStorage.setItem('cookie_consent_accepted', 'true');
            expect(hasCookieConsent()).toBe(true);
        });
    });
    describe('setCookieConsent', () => {
        it('должен всегда сохранять true в localStorage независимо от параметра', () => {
            setCookieConsent(true);
            expect(localStorage.getItem('cookie_consent_accepted')).toBe('true');
        });
        it('должен всегда сохранять true в localStorage даже при передаче false', () => {
            // Теперь отказа нет, поэтому всегда сохраняется true
            setCookieConsent(false);
            expect(localStorage.getItem('cookie_consent_accepted')).toBe('true');
        });
    });
    describe('shouldShowCookieBanner', () => {
        it('должен возвращать true если согласие еще не было запрошено', () => {
            expect(shouldShowCookieBanner()).toBe(true);
        });
        it('должен возвращать false если согласие дано', () => {
            localStorage.setItem('cookie_consent_accepted', 'true');
            expect(shouldShowCookieBanner()).toBe(false);
        });
        it('должен возвращать false если в localStorage значение false (старое значение)', () => {
            // Старое значение false - баннер не показывается (пользователь уже видел баннер)
            localStorage.setItem('cookie_consent_accepted', 'false');
            expect(shouldShowCookieBanner()).toBe(false);
        });
    });
});
