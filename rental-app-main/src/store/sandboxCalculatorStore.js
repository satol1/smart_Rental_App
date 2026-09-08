// src/store/sandboxCalculatorStore.ts
import { create } from "zustand";
import { useDateStore } from "./dateStore";
import { useHolidayStore } from "./holidayStore";
import { api } from "@/lib/api";
export const useSandboxCalculatorStore = create((set, get) => ({
    durationDiscountTiers: [],
    durationDiscountPercentage: 0,
    isLoadingTiers: false,
    isCalculatorVisible: false,
    _calculateDurationDiscount: (dayCount) => {
        const tiers = get().durationDiscountTiers;
        const applicableDiscount = tiers
            .filter(tier => dayCount >= tier.min_days)
            .sort((a, b) => b.min_days - a.min_days)[0];
        set({
            durationDiscountPercentage: applicableDiscount ? applicableDiscount.discount_percentage : 0,
        });
    },
    syncWithDateStore: () => {
        const { dayCount } = useDateStore.getState();
        const { _calculateDurationDiscount, isCalculatorVisible, fetchDiscountTiers } = get();
        if (dayCount >= 4 && !isCalculatorVisible) {
            set({ isCalculatorVisible: true });
            void fetchDiscountTiers();
        }
        if (get().durationDiscountTiers.length > 0) {
            _calculateDurationDiscount(dayCount);
        }
    },
    fetchDiscountTiers: async () => {
        if (get().durationDiscountTiers.length > 0 || get().isLoadingTiers)
            return;
        set({ isLoadingTiers: true });
        try {
            const response = await api.get("/discounts/");
            set({ durationDiscountTiers: response.data.items, isLoadingTiers: false });
            const { dayCount } = useDateStore.getState();
            get()._calculateDurationDiscount(dayCount);
        }
        catch (error) {
            console.error("Failed to fetch discount tiers:", error);
            set({ isLoadingTiers: false });
        }
    },
    setDaysFromCalendar: (days) => {
        const { isCalculatorVisible, fetchDiscountTiers, _calculateDurationDiscount } = get();
        if (!isCalculatorVisible && days >= 4) {
            void fetchDiscountTiers();
        }
        if (get().durationDiscountTiers.length > 0) {
            _calculateDurationDiscount(days);
        }
        if (days >= 4) {
            set({ isCalculatorVisible: true });
        }
    },
    setDaysFromSlider: (days) => {
        const dateStore = useDateStore.getState();
        const { holidays } = useHolidayStore.getState();
        // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
        // Теперь эта функция только передает данные в dateStore
        // и больше не вызывает расчет скидки напрямую.
        dateStore.setDayCount(days, holidays);
        // -------------------------
        if (days >= 4)
            set({ isCalculatorVisible: true });
    },
    toggleCalculator: () => {
        const alreadyVisible = get().isCalculatorVisible;
        if (!alreadyVisible)
            void get().fetchDiscountTiers();
        set({ isCalculatorVisible: !alreadyVisible });
    },
    refreshCalculator: () => {
        const { dayCount } = useDateStore.getState();
        const { _calculateDurationDiscount } = get();
        if (get().durationDiscountTiers.length > 0 && dayCount > 0) {
            _calculateDurationDiscount(dayCount);
        }
    },
}));
