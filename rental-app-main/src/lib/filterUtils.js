// src/lib/filterUtils.ts
/**
 * Применяет фильтр "скрыть завершенные" к списку заказов
 * @param orders - список заказов для фильтрации
 * @param statusFilter - текущий статус фильтра
 * @param orderType - тип заказа ('reservation' или 'rental')
 * @returns отфильтрованный список заказов
 */
export function applyHideCompletedFilter(orders, statusFilter, orderType = 'rental') {
    if (statusFilter === 'hide-completed') {
        if (orderType === 'reservation') {
            // Для резервов: скрываем "fulfilled" (выдан в аренду) и "cancelled" (отменен)
            return orders.filter(order => order.status !== 'fulfilled' && order.status !== 'cancelled');
        }
        else {
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
export function isHideCompletedFilterActive(statusFilter) {
    return statusFilter === 'hide-completed';
}
/**
 * Получает текст для чекбокса "Скрыть завершенные"
 * @param statusFilter - текущий статус фильтра
 * @returns текст для чекбокса
 */
export function getHideCompletedCheckboxText(statusFilter) {
    return isHideCompletedFilterActive(statusFilter)
        ? 'Скрыть завершенные'
        : 'Показать все';
}
