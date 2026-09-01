// src/constants/userConstants.ts

/**
 * Системные имена ролей пользователей.
 * Используются для общения с API и в логике.
 */
export const USER_ROLES = {
    USER: "user",
    MANAGER: "manager",
    ADMIN: "admin",
} as const;

// Создаем тип на основе ключей объекта USER_ROLES для удобства
type UserRoleKey = keyof typeof USER_ROLES;

/**
 * Тип для системных имен ролей.
 * Пример: 'user' | 'manager' | 'admin'
 */
export type UserRole = (typeof USER_ROLES)[UserRoleKey];

// ✅ ИЗМЕНЕНИЕ: Создаем массив ролей и явно указываем TypeScript,
// что это непустой кортеж из наших конкретных ролей.
// Это и есть исправление ошибки.
export const USER_ROLE_VALUES = Object.values(USER_ROLES) as [UserRole, ...UserRole[]];

/**
 * Метки ролей для отображения в интерфейсе.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
    [USER_ROLES.USER]: "Пользователь",
    [USER_ROLES.MANAGER]: "Менеджер",
    [USER_ROLES.ADMIN]: "Админ",
};

/**
 * Варианты (цвета) для компонента Badge из UI-библиотеки.
 */
export const USER_ROLE_BADGE_VARIANTS: Record<UserRole, "secondary" | "default" | "destructive"> = {
    [USER_ROLES.USER]: "secondary",
    [USER_ROLES.MANAGER]: "default",
    [USER_ROLES.ADMIN]: "destructive",
};

/**
 * Полный набор данных для каждой роли, удобный для генерации UI-элементов.
 */
export const USER_ROLE_OPTIONS = (Object.keys(USER_ROLES) as UserRoleKey[]).map(key => ({
    value: USER_ROLES[key],
    label: USER_ROLE_LABELS[USER_ROLES[key]],
}));