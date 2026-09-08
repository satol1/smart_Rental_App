// src/store/dateStore.ts
import { create } from "zustand";
import { calculateDayCount } from "@/lib/utils";
import { addDays } from "date-fns";
import { DateService } from "@/core/services/DateService";
// Вспомогательные функции
function normalizeDate(date) {
    const local = new Date(date);
    local.setHours(12, 0, 0, 0); // Устанавливаем время на полдень для избежания проблем с часовыми поясами
    return local;
}
function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}
function isValidDateRange(start, end) {
    return isValidDate(start) && isValidDate(end) && start < end;
}
// Начальные значения по умолчанию
const defaultStart = normalizeDate(new Date());
const defaultEnd = normalizeDate(new Date(new Date().setDate(new Date().getDate() + 1)));
export const useDateStore = create((set, get) => ({
    startDate: defaultStart,
    endDate: defaultEnd,
    dayCount: 1,
    // +++ НАЧАЛО: НОВАЯ ФУНКЦИЯ ДЛЯ ИНИЦИАЛИЗАЦИИ ДАТ +++
    initializeDates: (holidays) => {
        const today = normalizeDate(new Date());
        // Сдвигаем дату начала, если сегодня выходной
        const initialStartDate = DateService.adjustDateIfHoliday(today, holidays);
        // Находим следующий рабочий день после скорректированной даты начала
        const initialEndDate = DateService.findNextWorkingDay(initialStartDate, holidays, 1);
        // Устанавливаем новый диапазон
        get().setRange(initialStartDate, initialEndDate, 'manual', holidays);
    },
    // +++ КОНЕЦ: НОВАЯ ФУНКЦИЯ +++
    setRange: (from, to, _source, holidays = []) => {
        const currentState = get();
        const normalizedFrom = normalizeDate(from);
        let normalizedTo = normalizeDate(to);
        if (normalizedFrom.getTime() >= normalizedTo.getTime()) {
            normalizedTo = new Date(normalizedFrom);
            normalizedTo.setDate(normalizedTo.getDate() + 1);
        }
        normalizedTo = DateService.adjustDateIfHoliday(normalizedTo, holidays);
        if (normalizedFrom.getTime() === currentState.startDate.getTime() &&
            normalizedTo.getTime() === currentState.endDate.getTime()) {
            return;
        }
        if (!isValidDateRange(normalizedFrom, normalizedTo)) {
            console.error("[dateStore] Invalid date range:", { from, to });
            return;
        }
        const newDayCount = calculateDayCount(normalizedFrom, normalizedTo, holidays);
        set({
            startDate: normalizedFrom,
            endDate: normalizedTo,
            dayCount: newDayCount,
        });
    },
    setStartDate: (date, holidays = []) => {
        if (!isValidDate(date))
            return;
        const state = get();
        const normalizedDate = normalizeDate(date);
        if (isValidDateRange(normalizedDate, state.endDate)) {
            get().setRange(normalizedDate, state.endDate, 'manual', holidays);
        }
        else {
            const newEndDate = new Date(normalizedDate);
            newEndDate.setDate(newEndDate.getDate() + 1);
            get().setRange(normalizedDate, newEndDate, 'manual', holidays);
        }
    },
    setEndDate: (date, holidays = []) => {
        if (!isValidDate(date))
            return;
        const state = get();
        const normalizedDate = normalizeDate(date);
        if (isValidDateRange(state.startDate, normalizedDate)) {
            get().setRange(state.startDate, normalizedDate, 'manual', holidays);
        }
    },
    setDayCount: (days, holidays = []) => {
        const state = get();
        // Ищем дату окончания, при которой calculateDayCount вернет нужное количество рабочих дней
        let endDate = new Date(state.startDate);
        let currentWorkingDays = 0;
        // Итеративно увеличиваем дату окончания, пока не получим нужное количество рабочих дней
        while (currentWorkingDays < days) {
            endDate = addDays(endDate, 1);
            currentWorkingDays = calculateDayCount(state.startDate, endDate, holidays);
        }
        get().setRange(state.startDate, endDate, 'slider', holidays);
    },
    reset: (holidays = []) => {
        const newStart = normalizeDate(new Date());
        const newEnd = normalizeDate(new Date());
        newEnd.setDate(newEnd.getDate() + 1);
        get().setRange(newStart, newEnd, 'manual', holidays);
    },
}));
