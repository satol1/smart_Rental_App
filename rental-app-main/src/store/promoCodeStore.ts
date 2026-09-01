// path: rental-app-main/src/store/promoCodeStore.ts

import { create } from "zustand";
import { toast } from "sonner";

type PromoCodeState = {
    // Текущий ввод пользователя (поле ввода)
    promoCodeInput: string;
    // Промокод, который был успешно валидирован и применен к расчету
    appliedPromoCode: string;
    promoCodePercentage: number;
    promoCodeMessage: string;
};

type PromoCodeActions = {
    setPromoCodeInput: (code: string) => void;
    applyPromoCode: () => void;
    setPromoCodeResult: (percentage: number, message: string) => void;
    removePromoCode: () => void;
    // "Тихий" сброс, используемый программно при закрытии форм/диалогов
    clearPromoCode: () => void;
    // Новый метод для инициализации стора при редактировании
    initializeFromReservation: (code: string | null | undefined, percentage: number) => void;
};

type PromoCodeStore = PromoCodeState & PromoCodeActions;

export const usePromoCodeStore = create<PromoCodeStore>((set, get) => ({
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