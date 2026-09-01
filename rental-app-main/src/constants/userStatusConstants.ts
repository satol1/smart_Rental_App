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
 * Проверяет, может ли пользователь редактировать резерв за N дней до начала
 */
export function canUserEditReservation(userStatus: UserStatus | null | undefined, daysUntilStart: number): boolean {
    if (!userStatus) {
        console.warn('[canUserEditReservation] userStatus is null or undefined');
        return false;
    }
    
    const restrictionDays = EDIT_RESTRICTION_DAYS[userStatus as UserStatus];
    
    // Отладочная информация (всегда выводим для диагностики)
    console.log('[canUserEditReservation]', {
        userStatus,
        daysUntilStart,
        restrictionDays,
        restrictionDaysUndefined: restrictionDays === undefined,
    });
    
    if (restrictionDays === undefined) {
        console.error(`[canUserEditReservation] Не найдено ограничение для статуса: ${userStatus}`);
        return false;
    }
    
    if (restrictionDays === 999) return false; // Персона НонГрата
    if (restrictionDays === 0) return true; // VIP - нет ограничений
    
    const result = daysUntilStart > restrictionDays;
    
    console.log('[canUserEditReservation] result:', {
        daysUntilStart,
        restrictionDays,
        comparison: `${daysUntilStart} > ${restrictionDays}`,
        result
    });
    
    return result;
}

/**
 * Проверяет, может ли пользователь отменить резерв за N дней до начала
 */
export function canUserCancelReservation(userStatus: UserStatus | null | undefined, daysUntilStart: number): boolean {
    return canUserEditReservation(userStatus, daysUntilStart);
}

/**
 * Получает максимальное количество резервов для статуса пользователя
 */
export function getMaxReservationsForStatus(userStatus: UserStatus | null | undefined): number {
    if (!userStatus) return 0;
    return MAX_RESERVATIONS_BY_STATUS[userStatus as UserStatus] || 0;
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

