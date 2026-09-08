// src/core/services/DateService.ts
import { addDays, format } from 'date-fns';
export class DateService {
    /**
     * Корректирует дату, если она выпадает на выходной, сдвигая её на ближайший рабочий день.
     * @param date - Проверяемая дата
     * @param holidays - Массив дат-выходных
     * @returns Скорректированная дата
     */
    static adjustDateIfHoliday(date, holidays) {
        let adjustedDate = new Date(date);
        const holidaySet = new Set(holidays.map(h => format(h, 'yyyy-MM-dd')));
        // Пока итоговая дата является выходным, добавляем один день
        while (holidaySet.has(format(adjustedDate, 'yyyy-MM-dd'))) {
            adjustedDate = addDays(adjustedDate, 1);
        }
        return adjustedDate;
    }
    /**
     * Проверяет, является ли дата выходным днем.
     * @param date - Проверяемая дата
     * @param holidays - Массив дат-выходных
     * @returns `true` , если дата является выходным, иначе `false`
     */
    static isHoliday(date, holidays) {
        if (!date || !Array.isArray(holidays) || holidays.length === 0) {
            return false;
        }
        const holidaySet = new Set(holidays.map(h => format(h, 'yyyy-MM-dd')));
        return holidaySet.has(format(date, 'yyyy-MM-dd'));
    }
    /**
     * Валидирует диапазон дат
     */
    static validateDateRange(startDate, endDate) {
        if (!startDate || !endDate) {
            return {
                isValid: false,
                error: 'Даты начала и окончания обязательны'
            };
        }
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return {
                isValid: false,
                error: 'Некорректный формат даты'
            };
        }
        if (startDate >= endDate) {
            return {
                isValid: false,
                error: 'Дата окончания должна быть позже даты начала'
            };
        }
        return {
            isValid: true
        };
    }
    /**
     * Корректирует диапазон дат, если endDate раньше startDate
     */
    static adjustDateRange(startDate, endDate) {
        if (startDate >= endDate) {
            const adjustedEndDate = new Date(startDate);
            adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
            return {
                startDate,
                endDate: adjustedEndDate
            };
        }
        return { startDate, endDate };
    }
    /**
     * Проверяет, является ли дата валидной
     */
    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }
    /**
     * Создает следующую дату после указанной
     */
    static getNextDay(date) {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay;
    }
    /**
     * Создает предыдущую дату перед указанной
     */
    static getPreviousDay(date) {
        const previousDay = new Date(date);
        previousDay.setDate(previousDay.getDate() - 1);
        return previousDay;
    }
    /**
     * Вычисляет количество дней между двумя датами
     */
    static getDaysDifference(startDate, endDate) {
        const timeDiff = endDate.getTime() - startDate.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
    /**
     * Проверяет, находится ли дата в заданном диапазоне
     */
    static isDateInRange(date, startDate, endDate) {
        return date >= startDate && date <= endDate;
    }
    /**
     * Форматирует дату в строку для API (YYYY-MM-DD)
     */
    static formatDateForAPI(date) {
        return date.toISOString().split('T')[0];
    }
    /**
     * Парсит строку даты в объект Date
     */
    static parseDate(dateString) {
        const date = new Date(dateString);
        return this.isValidDate(date) ? date : null;
    }
    /**
     * Находит следующий рабочий день, исключая праздники
     * @param startDate - начальная дата
     * @param holidays - массив дат праздников
     * @param daysToAdd - количество дней для добавления (по умолчанию 1)
     * @returns Дата следующего рабочего дня
     */
    static findNextWorkingDay(startDate, holidays, daysToAdd = 1) {
        let finalDate = addDays(startDate, daysToAdd);
        // Создаем Set из дат праздников для быстрой проверки
        const holidaySet = new Set(holidays.map(h => format(h, 'yyyy-MM-dd')));
        // Проверяем, не является ли конечная дата выходным.
        // Если да, сдвигаем ее вперед до тех пор, пока не найдем рабочий день.
        while (holidaySet.has(format(finalDate, 'yyyy-MM-dd'))) {
            finalDate = addDays(finalDate, 1);
        }
        return finalDate;
    }
    /**
     * Создает диапазон дат с автоматическим поиском рабочего дня окончания
     * @param startDate - дата начала
     * @param holidays - массив дат праздников
     * @param daysToAdd - количество дней для добавления (по умолчанию 1)
     * @returns Объект с датами начала и окончания
     */
    static createWorkingDayRange(startDate, holidays, daysToAdd = 1) {
        const endDate = this.findNextWorkingDay(startDate, holidays, daysToAdd);
        return {
            startDate,
            endDate
        };
    }
    /**
     * Автоматически устанавливает дату окончания на следующий рабочий день после даты начала
     * @param startDate - дата начала
     * @param holidays - массив дат праздников
     * @returns Объект с датами начала и окончания
     */
    static getAutoEndDate(startDate, holidays) {
        const endDate = this.findNextWorkingDay(startDate, holidays, 1);
        return {
            startDate,
            endDate
        };
    }
}
