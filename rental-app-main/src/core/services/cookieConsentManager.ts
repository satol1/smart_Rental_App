// src/core/services/cookieConsentManager.ts

/**
 * Централизованный менеджер для управления согласием на обработку cookie
 * Соответствует требованиям 152-ФЗ "О персональных данных"
 * 
 * Этот сервис является единой точкой доступа для проверки согласия на cookie
 * и используется во всех местах, где необходима работа с cookie
 */

const COOKIE_CONSENT_KEY = "cookie_consent_accepted";

/**
 * Получить текущий статус согласия на cookie
 * @returns true если согласие дано, null если еще не было запроса
 */
export function getCookieConsent(): boolean | null {
  if (typeof window === "undefined") {
    return null; // SSR или не браузерное окружение
  }
  
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (consent === null) {
    return null; // Согласие еще не было запрошено
  }
  return consent === "true";
}

/**
 * Проверить, дано ли согласие на использование cookie
 * @returns true если согласие дано, false в противном случае
 */
export function hasCookieConsent(): boolean {
  const consent = getCookieConsent();
  return consent === true;
}

/**
 * Сохранить согласие пользователя на использование cookie
 * @param accepted - true для принятия (теперь всегда true, параметр оставлен для обратной совместимости)
 */
export function setCookieConsent(accepted: boolean): void {
  // Параметр сохранён для обратной совместимости публичного API
  void accepted;
  if (typeof window === "undefined") {
    return;
  }
  // Теперь всегда сохраняем только true, так как отказа больше нет
  localStorage.setItem(COOKIE_CONSENT_KEY, "true");
}

/**
 * Проверить, должно ли отображаться баннер согласия
 * @returns true если баннер должен быть показан (только при первом посещении)
 */
export function shouldShowCookieBanner(): boolean {
  const consent = getCookieConsent();
  // Показываем баннер только если согласие еще не было запрошено (первое посещение)
  return consent === null;
}

