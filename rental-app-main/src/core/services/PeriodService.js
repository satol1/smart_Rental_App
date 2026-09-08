/**
 * Сервис для работы с временными периодами во frontend
 */
export class PeriodService {
    /**
     * Вычисляет даты начала и окончания для указанного периода
     */
    static getPeriodDates(periodType, periodOffset = 0) {
        const today = new Date();
        switch (periodType) {
            case "week":
                return this.getWeekDates(today, periodOffset);
            case "month":
                return this.getMonthDates(today, periodOffset);
            case "quarter":
                return this.getQuarterDates(today, periodOffset);
            case "year":
                return this.getYearDates(today, periodOffset);
            default:
                throw new Error(`Неподдерживаемый тип периода: ${periodType}`);
        }
    }
    /**
     * Вычисляет даты для недельного периода
     */
    static getWeekDates(baseDate, offset) {
        // Находим понедельник текущей недели
        const dayOfWeek = baseDate.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Воскресенье = 0, понедельник = 1
        const monday = new Date(baseDate);
        monday.setDate(baseDate.getDate() - daysSinceMonday);
        // Применяем смещение
        const targetMonday = new Date(monday);
        targetMonday.setDate(monday.getDate() + (offset * 7));
        const targetSunday = new Date(targetMonday);
        targetSunday.setDate(targetMonday.getDate() + 6);
        return { startDate: targetMonday, endDate: targetSunday };
    }
    /**
     * Вычисляет даты для месячного периода
     */
    static getMonthDates(baseDate, offset) {
        const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        // Применяем смещение
        const targetMonth = new Date(firstDay);
        targetMonth.setMonth(firstDay.getMonth() + offset);
        const startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
        const endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
        return { startDate, endDate };
    }
    /**
     * Вычисляет даты для квартального периода
     */
    static getQuarterDates(baseDate, offset) {
        const currentQuarter = Math.floor(baseDate.getMonth() / 3);
        const quarterStartMonth = currentQuarter * 3;
        const firstDay = new Date(baseDate.getFullYear(), quarterStartMonth, 1);
        // Применяем смещение
        const targetQuarter = new Date(firstDay);
        targetQuarter.setMonth(firstDay.getMonth() + (offset * 3));
        const startDate = new Date(targetQuarter.getFullYear(), targetQuarter.getMonth(), 1);
        const endDate = new Date(targetQuarter.getFullYear(), targetQuarter.getMonth() + 3, 0);
        return { startDate, endDate };
    }
    /**
     * Вычисляет даты для годового периода
     */
    static getYearDates(baseDate, offset) {
        const targetYear = baseDate.getFullYear() + offset;
        const startDate = new Date(targetYear, 0, 1);
        const endDate = new Date(targetYear, 11, 31);
        return { startDate, endDate };
    }
    /**
     * Генерирует читаемую метку для периода
     */
    static getPeriodLabel(periodType, periodOffset = 0) {
        if (!periodType)
            return "Все периоды";
        if (!this.validatePeriodParams(periodType, periodOffset))
            return "Ошибка периода";
        try {
            const { startDate, endDate } = this.getPeriodDates(periodType, periodOffset);
            switch (periodType) {
                case "week":
                    return `Неделя ${this.formatDate(startDate, "dd.MM")} - ${this.formatDate(endDate, "dd.MM.yyyy")}`;
                case "month":
                    return this.formatDate(startDate, "MMMM yyyy");
                case "quarter":
                    const quarterNum = Math.floor(startDate.getMonth() / 3) + 1;
                    return `${quarterNum} Квартал ${startDate.getFullYear()}`;
                case "year":
                    return startDate.getFullYear().toString();
                default:
                    return `${this.formatDate(startDate, "dd.MM.yyyy")} - ${this.formatDate(endDate, "dd.MM.yyyy")}`;
            }
        }
        catch {
            return "Ошибка периода";
        }
    }
    /**
     * Форматирует дату в указанном формате
     */
    static formatDate(date, format) {
        const months = [
            "января", "февраля", "марта", "апреля", "мая", "июня",
            "июля", "августа", "сентября", "октября", "ноября", "декабря"
        ];
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        const monthName = months[date.getMonth()];
        return format
            .replace("dd", day)
            .replace("MM", month)
            .replace("yyyy", year.toString())
            .replace("MMMM", monthName);
    }
    /**
     * Возвращает полную информацию о периоде
     */
    static getPeriodInfo(periodType, periodOffset = 0) {
        const { startDate, endDate } = this.getPeriodDates(periodType, periodOffset);
        const label = this.getPeriodLabel(periodType, periodOffset);
        return {
            startDate,
            endDate,
            label
        };
    }
    /**
     * Валидирует параметры периода
     */
    static validatePeriodParams(periodType, periodOffset = 0) {
        if (periodType === null) {
            return true; // Период не задан - это валидно
        }
        const validTypes = ["week", "month", "quarter", "year"];
        if (!validTypes.includes(periodType)) {
            return false;
        }
        // Проверяем разумные пределы смещения
        if (Math.abs(periodOffset) > 100) {
            return false;
        }
        return true;
    }
    /**
     * Возвращает опции периодов для UI
     */
    static getPeriodOptions() {
        return [
            {
                value: "week",
                label: "Неделя",
                description: "Показать резервы/аренды за неделю"
            },
            {
                value: "month",
                label: "Месяц",
                description: "Показать резервы/аренды за месяц"
            },
            {
                value: "quarter",
                label: "Квартал",
                description: "Показать резервы/аренды за квартал"
            },
            {
                value: "year",
                label: "Год",
                description: "Показать резервы/аренды за год"
            }
        ];
    }
    /**
     * Возвращает информацию о навигации по периодам
     */
    static getPeriodNavigation(periodType, periodOffset = 0) {
        if (!periodType) {
            return {
                canGoBack: false,
                canGoForward: false,
                currentOffset: 0,
                currentLabel: "Все периоды"
            };
        }
        const currentLabel = this.getPeriodLabel(periodType, periodOffset);
        return {
            canGoBack: true,
            canGoForward: true,
            currentOffset: periodOffset,
            currentLabel
        };
    }
    /**
     * Проверяет, пересекается ли период с заданными датами
     */
    static isPeriodOverlapping(periodType, periodOffset, startDate, endDate) {
        const { startDate: periodStart, endDate: periodEnd } = this.getPeriodDates(periodType, periodOffset);
        // Проверяем пересечение: startDate <= periodEnd AND endDate >= periodStart
        return startDate <= periodEnd && endDate >= periodStart;
    }
}
