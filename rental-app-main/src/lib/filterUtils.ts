// src/lib/filterUtils.ts

/**
 * Централизованная логика фильтрации для заказов (резервы и аренды)
 */

import type { OrderStatus } from "@/constants/statusConstants";

export interface FilterableOrder {
    status: OrderStatus;
}

/**
 * Применяет фильтр "скрыть завершенные" к списку заказов
 * @param orders - список заказов для фильтрации
 * @param statusFilter - текущий статус фильтра
 * @param orderType - тип заказа ('reservation' или 'rental')
 * @returns отфильтрованный список заказов
 */
export function applyHideCompletedFilter<T extends FilterableOrder>(
    orders: T[],
    statusFilter: string | null,
    orderType: 'reservation' | 'rental' = 'rental'
): T[] {
    if (statusFilter === 'hide-completed') {
        if (orderType === 'reservation') {
            // Для резервов: скрываем "fulfilled" (выдан в аренду) и "cancelled" (отменен)
            return orders.filter(order => order.status !== 'fulfilled' && order.status !== 'cancelled');
        } else {
            // Для аренд: скрываем "completed" (завершен)
            return orders.filter(order => order.status !== 'completed');
        }
    }
    
    // Показываем все статусы
    return orders;
}

/**
 * Проверяет, активен ли фильтр "скрыть завершенные"
 * @param statusFilter - текущий статус фильтра
 * @returns true если фильтр активен
 */
export function isHideCompletedFilterActive(statusFilter: string | null): boolean {
    return statusFilter === 'hide-completed';
}

/**
 * Получает текст для чекбокса "Скрыть завершенные"
 * @param statusFilter - текущий статус фильтра
 * @returns текст для чекбокса
 */
export function getHideCompletedCheckboxText(statusFilter: string | null): string {
    return isHideCompletedFilterActive(statusFilter) 
        ? 'Скрыть завершенные' 
        : 'Показать все';
}
