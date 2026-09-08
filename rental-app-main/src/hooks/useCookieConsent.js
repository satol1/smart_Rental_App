// src/hooks/useCookieConsent.ts
import { useState, useEffect } from "react";
import { getCookieConsent, setCookieConsent, shouldShowCookieBanner } from "@/core/services/cookieConsentManager";
/**
 * Хук для управления согласием на обработку cookie
 * Использует централизованный сервис cookieConsentManager
 * Соответствует требованиям 152-ФЗ "О персональных данных"
 */
export function useCookieConsent() {
    const [state, setState] = useState({
        hasConsent: null,
        isLoading: true,
    });
    useEffect(() => {
        // Проверяем согласие через централизованный сервис при монтировании
        const consent = getCookieConsent();
        setState({
            hasConsent: consent,
            isLoading: false,
        });
    }, []);
    const acceptCookies = () => {
        setCookieConsent(true);
        setState({
            hasConsent: true,
            isLoading: false,
        });
        // Интерцептор api автоматически применит изменения (withCredentials теперь включен)
    };
    const shouldShowBanner = shouldShowCookieBanner() && !state.isLoading;
    return {
        hasConsent: state.hasConsent,
        isLoading: state.isLoading,
        shouldShowBanner,
        acceptCookies,
    };
}
