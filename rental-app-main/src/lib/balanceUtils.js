// src/lib/balanceUtils.ts
import { formatMoney } from "@/components/ui/money-text";
/**
 * Централизованные утилиты для работы с балансом пользователя
 */
/**
 * Форматирует баланс для отображения в интерфейсе.
 * Делегирует единый формат MoneyText (Intl.NumberFormat ru-RU, RUB).
 * @param balance - значение баланса
 * @returns отформатированная строка с валютой
 */
export function formatBalance(balance) {
    return formatMoney(balance);
}
/**
 * Определяет цвет для отображения баланса
 * @param balance - значение баланса
 * @returns CSS класс для цвета
 */
export function getBalanceColor(balance) {
    const balanceValue = Number(balance ?? 0);
    return balanceValue < 0 ? 'text-red-600' : 'text-green-700';
}
/**
 * Получает числовое значение баланса
 * @param balance - значение баланса
 * @returns числовое значение баланса
 */
export function getBalanceValue(balance) {
    return Number(balance ?? 0);
}
/**
 * Проверяет, является ли баланс отрицательным
 * @param balance - значение баланса
 * @returns true, если баланс отрицательный
 */
export function isNegativeBalance(balance) {
    return getBalanceValue(balance) < 0;
}
