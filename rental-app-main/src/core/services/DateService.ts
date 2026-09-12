// src/core/services/DateService.ts

import { addDays, format } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeValidationResult {
  isValid: boolean;
  error?: string;
  adjustedRange?: DateRange;
}

export class DateService {
  /**
   * Корректирует дату, если она выпадает на выходной, сдвигая её на ближайший рабочий день.
   * @param date - Проверяемая дата
   * @param holidays - Массив дат-выходных
   * @returns Скорректированная дата
   */
  static adjustDateIfHoliday(date: Date, holidays: Date[]): Date {
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
  static isHoliday(date: Date, holidays: Date[]): boolean {
    if (!date || !Array.isArray(holidays) || holidays.length === 0) {
      return false;
    }
    const holidaySet = new Set(holidays.map(h => format(h, 'yyyy-MM-dd')));
    return holidaySet.has(format(date, 'yyyy-MM-dd'));
  }

  /**
   * Валидирует диапазон дат
   */
  static validateDateRange(startDate: Date, endDate: Date): DateRangeValidationResult {
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
   */
  static adjustDateRange(startDate: Date, endDate: Date): DateRange {
    if (startDate > endDate) {
      return {
        startDate,
        endDate: new Date(startDate)
      };
    }

    return { startDate, endDate };
  }

  /**
   * Проверяет, является ли дата валидной
   */
  static isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Создает следующую дату после указанной
   */
  static getNextDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  }

  /**
   * Создает предыдущую дату перед указанной
   */
  static getPreviousDay(date: Date): Date {
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    return previousDay;
  }

  /**
   * Вычисляет количество дней между двумя датами
   */
  static getDaysDifference(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Проверяет, находится ли дата в заданном диапазоне
   */
  static isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }

  /**
   * Форматирует дату в строку для API (YYYY-MM-DD)
   */
  static formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Парсит строку даты в объект Date
   */
  static parseDate(dateString: string): Date | null {
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
  static findNextWorkingDay(startDate: Date, holidays: Date[], daysToAdd: number = 1): Date {
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
  static createWorkingDayRange(startDate: Date, holidays: Date[], daysToAdd: number = 1): DateRange {
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
  static getAutoEndDate(startDate: Date, holidays: Date[]): { startDate: Date; endDate: Date } {
    const endDate = this.findNextWorkingDay(startDate, holidays, 1);
    return {
      startDate,
      endDate
    };
  }

}