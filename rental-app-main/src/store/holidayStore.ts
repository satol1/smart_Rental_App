// path: rental-app-main/src/store/holidayStore.ts

import { create } from 'zustand';
import { formatDate } from '@/lib/utils';
import { HolidayService } from '@/core/services/HolidayService';

type HolidayState = {
    holidays: Date[];
    isLoading: boolean;
    lastFetchedRange: { start: string; end: string } | null;
    fetchHolidays: (start: Date, end: Date) => Promise<void>;
};

export const useHolidayStore = create<HolidayState>((set, get) => ({
    holidays: [],
    isLoading: false,
    lastFetchedRange: null,

    fetchHolidays: async (start, end) => {
        const formattedStart = formatDate(start);
        const formattedEnd = formatDate(end);
        const currentRange = get().lastFetchedRange;

        if (get().holidays.length > 0 && currentRange?.start === formattedStart && currentRange?.end === formattedEnd) {
            return;
        }

        set({ isLoading: true });
        try {
            // Сервис уже возвращает данные в нужном формате
            const { items: holidayItems } = await HolidayService.getHolidays(start, end);
            
            // Просто извлекаем объекты Date
            const holidayDates = holidayItems.map(h => h.date);
            
            set({
                holidays: holidayDates,
                lastFetchedRange: { start: formattedStart, end: formattedEnd },
            });
        } catch (error) {
            console.error("Failed to fetch holidays:", error);
            set({ holidays: [], lastFetchedRange: null });
        } finally {
            set({ isLoading: false });
        }
    },
}));