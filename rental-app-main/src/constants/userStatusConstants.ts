// src/constants/userStatusConstants.ts

/**
 * Константы статусов пользователей с градацией прав.
 * Синхронизировано с бэкендом: RentalApp_FASTAPI/shared/constants/user_status.py
 */

export const USER_STATUS = {
    NEW: "Новый",
    REGULAR: "Постоянный",
    VIP: "VIP",
    BLOCKED: "Заблокирован",
    PERSONA_NON_GRATA: "Персона НонГрата",
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

/**
 * Лимиты на количество одновременных резервов по статусам
 */
export const MAX_RESERVATIONS_BY_STATUS: Record<UserStatus, number> = {
    [USER_STATUS.NEW]: 2,
    [USER_STATUS.REGULAR]: 5,
    [USER_STATUS.VIP]: 10,
    [USER_STATUS.BLOCKED]: 0, // Не может создавать сам
    [USER_STATUS.PERSONA_NON_GRATA]: 0,
};

/**
 * Ограничения на редактирование/отмену (дни до начала)
 */
export const EDIT_RESTRICTION_DAYS: Record<UserStatus, number> = {
    [USER_STATUS.NEW]: 2,
    [USER_STATUS.REGULAR]: 1,
    [USER_STATUS.VIP]: 0, // Нет ограничений
    [USER_STATUS.BLOCKED]: 2, // Если менеджер создает резерв
    [USER_STATUS.PERSONA_NON_GRATA]: 999, // Нельзя редактировать
};

/**
 * Grace-период после создания резерва (часы): в течение него резерв
 * можно отменить/отредактировать независимо от близости даты начала.
 * Синхронизировано с RESERVATION_GRACE_PERIOD_HOURS бэкенда.
 */
export const RESERVATION_GRACE_PERIOD_HOURS = 24;

/**
 * Находится ли момент создания резерва в grace-периоде.
 * createdAt приходит с бэкенда (ISO-строка); null/невалидная дата → false.
 */
export function isInReservationGracePeriod(createdAt?: string | null): boolean {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return false;
    return Date.now() - created.getTime() < RESERVATION_GRACE_PERIOD_HOURS * 60 * 60 * 1000;
}

/**
 * Сколько часов grace-периода осталось (для подсказок в UI); 0 — если истёк.
 */
export function remainingGraceHours(createdAt?: string | null): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt);
    if (isNaN(created.getTime())) return 0;
    const elapsedHours = (Date.now() - created.getTime()) / (60 * 60 * 1000);
    return Math.max(0, Math.ceil(RESERVATION_GRACE_PERIOD_HOURS - elapsedHours));
}

/**
 * Опции статусов для выпадающих списков
 */
export const USER_STATUS_OPTIONS = [
    { value: USER_STATUS.NEW, label: USER_STATUS.NEW },
    { value: USER_STATUS.REGULAR, label: USER_STATUS.REGULAR },
    { value: USER_STATUS.VIP, label: USER_STATUS.VIP },
    { value: USER_STATUS.BLOCKED, label: USER_STATUS.BLOCKED },
    { value: USER_STATUS.PERSONA_NON_GRATA, label: USER_STATUS.PERSONA_NON_GRATA },
] as const;

/**
 * Варианты Badge для статусов пользователей
 */
export const USER_STATUS_BADGE_VARIANTS: Record<UserStatus, "default" | "secondary" | "destructive" | "outline"> = {
    [USER_STATUS.NEW]: "secondary",
    [USER_STATUS.REGULAR]: "default",
    [USER_STATUS.VIP]: "default",
    [USER_STATUS.BLOCKED]: "destructive",
    [USER_STATUS.PERSONA_NON_GRATA]: "destructive",
};

/**
 * Цвета для индикации статусов в UI
 */
export const USER_STATUS_COLORS: Record<UserStatus, string> = {
    [USER_STATUS.NEW]: "text-gray-600 bg-gray-100",
    [USER_STATUS.REGULAR]: "text-blue-600 bg-blue-100",
    [USER_STATUS.VIP]: "text-purple-600 bg-purple-100",
    [USER_STATUS.BLOCKED]: "text-red-600 bg-red-100",
    [USER_STATUS.PERSONA_NON_GRATA]: "text-red-800 bg-red-200",
};

/**
 * Проверяет, может ли пользователь редактировать резерв.
 * daysUntilStart — нормализованные дни до начала (см. utils/dates), createdAt —
 * момент создания резерва (для grace-периода).
 *
 * Правила (зеркало бэкенда user_status_service.py):
 * - Персона НонГрата — нельзя;
 * - прошедшая дата начала — нельзя;
 * - grace-период (24 ч после создания) — можно;
 * - VIP — можно; остальным нужен запас больше restrictionDays.
 */
export function canUserEditReservation(
    userStatus: UserStatus | null | undefined,
    daysUntilStart: number,
    createdAt?: string | null
): boolean {
    if (!userStatus) return false;

    const restrictionDays = EDIT_RESTRICTION_DAYS[userStatus];
    if (restrictionDays === undefined) return false;

    if (restrictionDays === 999) return false; // Персона НонГрата
    if (daysUntilStart < 0 || Number.isNaN(daysUntilStart)) return false; // прошло
    if (isInReservationGracePeriod(createdAt)) return true; // grace-период
    if (restrictionDays === 0) return true; // VIP

    return daysUntilStart > restrictionDays;
}

/**
 * Проверяет, может ли пользователь отменить резерв (те же правила, что и редактирование).
 */
export function canUserCancelReservation(
    userStatus: UserStatus | null | undefined,
    daysUntilStart: number,
    createdAt?: string | null
): boolean {
    return canUserEditReservation(userStatus, daysUntilStart, createdAt);
}

/**
 * Получает максимальное количество резервов для статуса пользователя
 */
export function getMaxReservationsForStatus(userStatus: UserStatus | null | undefined): number {
    if (!userStatus) return 0;
    return MAX_RESERVATIONS_BY_STATUS[userStatus] || 0;
}

/**
 * Маппинг старых статусов на новые для обратной совместимости.
 * Используется для обработки статусов, которые могли быть установлены до введения новой системы градации.
 */
export function mapLegacyUserStatus(status: string | null | undefined): UserStatus | null {
    if (!status) return null;

    // Если статус уже является валидным UserStatus, возвращаем его
    if (Object.values(USER_STATUS).includes(status as UserStatus)) {
        return status as UserStatus;
    }

    // Маппинг старых статусов на новые
    const legacyStatusMap: Record<string, UserStatus> = {
        "Активный": USER_STATUS.NEW,
        "Требует подтверждения": USER_STATUS.NEW,
    };

    return legacyStatusMap[status] || null;
}
