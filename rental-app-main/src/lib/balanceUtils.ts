// src/lib/balanceUtils.ts

/**
 * Централизованные утилиты для работы с балансом пользователя
 */

/**
 * Форматирует баланс для отображения в интерфейсе
 * @param balance - значение баланса
 * @returns отформатированная строка с валютой
 */
export function formatBalance(balance: number | null | undefined): string {
    const balanceValue = Number(balance ?? 0);
    return `${balanceValue.toLocaleString('ru-RU')} ₽`;
}

/**
 * Определяет цвет для отображения баланса
 * @param balance - значение баланса
 * @returns CSS класс для цвета
 */
export function getBalanceColor(balance: number | null | undefined): string {
    const balanceValue = Number(balance ?? 0);
    return balanceValue < 0 ? 'text-red-600' : 'text-green-700';
}

/**
 * Получает числовое значение баланса
 * @param balance - значение баланса
 * @returns числовое значение баланса
 */
export function getBalanceValue(balance: number | null | undefined): number {
    return Number(balance ?? 0);
}

/**
 * Проверяет, является ли баланс отрицательным
 * @param balance - значение баланса
 * @returns true, если баланс отрицательный
 */
export function isNegativeBalance(balance: number | null | undefined): boolean {
    return getBalanceValue(balance) < 0;
}
