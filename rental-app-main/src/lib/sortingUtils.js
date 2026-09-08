// src/lib/sortingUtils.ts
import { differenceInDays } from "date-fns";
/**
 * Сортирует выдачи по приоритету:
 * 1. Выдачи на сегодня (без start_date или start_date = сегодня)
 * 2. Просроченные выдачи по количеству дней просрочки (по возрастанию)
 */
export const sortPickupsByPriority = (pickups, today) => {
    return [...pickups].sort((a, b) => {
        const aStartDate = a.start_date ? new Date(a.start_date) : null;
        const bStartDate = b.start_date ? new Date(b.start_date) : null;
        // Если у элемента нет start_date, считаем его выдачей на сегодня
        const aIsToday = !aStartDate || aStartDate.getTime() === today.getTime();
        const bIsToday = !bStartDate || bStartDate.getTime() === today.getTime();
        // Сначала выдачи на сегодня
        if (aIsToday && !bIsToday)
            return -1;
        if (!aIsToday && bIsToday)
            return 1;
        // Если оба не на сегодня, сортируем по количеству дней просрочки
        if (!aIsToday && !bIsToday) {
            const aDaysPassed = aStartDate ? differenceInDays(today, aStartDate) : 0;
            const bDaysPassed = bStartDate ? differenceInDays(today, bStartDate) : 0;
            return aDaysPassed - bDaysPassed; // Меньше дней просрочки - выше в списке
        }
        return 0;
    });
};
/**
 * Сортирует просроченные аренды по количеству дней просрочки (по возрастанию)
 */
export const sortOverdueRentalsByDays = (overdueRentals) => {
    return [...overdueRentals].sort((a, b) => {
        // Используем days_overdue если есть, иначе вычисляем разность
        const aDaysOverdue = a.days_overdue ?? 0;
        const bDaysOverdue = b.days_overdue ?? 0;
        return aDaysOverdue - bDaysOverdue; // Меньше дней просрочки - выше в списке
    });
};
/**
 * Создает сегодняшнюю дату с обнуленным временем для корректного сравнения
 */
export const getTodayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};
