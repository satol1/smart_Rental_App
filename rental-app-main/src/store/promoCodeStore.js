// path: rental-app-main/src/store/promoCodeStore.ts
import { create } from "zustand";
import { toast } from "sonner";
export const usePromoCodeStore = create((set) => ({
    // State
    promoCodeInput: "",
    appliedPromoCode: "",
    promoCodePercentage: 0,
    promoCodeMessage: "",
    // Actions
    setPromoCodeInput: (code) => set({ promoCodeInput: code, promoCodeMessage: "" }), // Сбрасываем сообщение при новом вводе
    // Теперь "применение" - это фиксация введенного кода для расчетов
    applyPromoCode: () => set((state) => ({ appliedPromoCode: state.promoCodeInput })),
    setPromoCodeResult: (percentage, message) => set({
        promoCodePercentage: percentage,
        promoCodeMessage: message
    }),
    removePromoCode: () => {
        set({ promoCodeInput: "", appliedPromoCode: "", promoCodePercentage: 0, promoCodeMessage: "" });
        toast.info("Промокод сброшен.");
    },
    clearPromoCode: () => set({ promoCodeInput: "", appliedPromoCode: "", promoCodePercentage: 0, promoCodeMessage: "" }),
    initializeFromReservation: (code, percentage) => {
        const promoCodeStr = code || "";
        set({
            promoCodeInput: promoCodeStr,
            appliedPromoCode: promoCodeStr,
            promoCodePercentage: percentage,
            promoCodeMessage: percentage > 0 ? "Промокод успешно применен!" : ""
        });
    },
}));
