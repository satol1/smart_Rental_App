// path: rental-app-main/src/store/promoCodeStore.ts

import { create } from "zustand";
import { toast } from "sonner";

// Ключи скоупов изолируют состояние промокода между параллельно смонтированными
// формами (карточки редактирования резервов, диалоги создания), чтобы они не
// перезаписывали ввод и примененный промокод друг друга (задача 1.2 аудита).
export const RESERVE_PROMO_SCOPE = "reserve";
export const ADMIN_CREATE_RESERVATION_PROMO_SCOPE = "admin-create-reservation";
export const ADMIN_CREATE_RENTAL_PROMO_SCOPE = "admin-create-rental";
export const editReservationPromoScope = (reservationId: number) => `edit-reservation:${reservationId}`;

/** Состояние промокода одного флоу (формы) */
type PromoScopeState = {
    // Текущий ввод пользователя (поле ввода)
    promoCodeInput: string;
    // Промокод, который был успешно валидирован и применен к расчету
    appliedPromoCode: string;
    promoCodePercentage: number;
    promoCodeMessage: string;
    // Структурный флаг успеха применения — вместо разбора текста сообщения (задача 1.5)
    promoCodeValid: boolean;
};

type PromoCodeActions = {
    setPromoCodeInput: (scope: string, code: string) => void;
    applyPromoCode: (scope: string) => void;
    setPromoCodeResult: (scope: string, percentage: number, message: string, valid: boolean) => void;
    removePromoCode: (scope: string) => void;
    // "Тихий" сброс, используемый программно при закрытии форм/диалогов
    clearPromoCode: (scope: string) => void;
    // Метод для инициализации скоупа при редактировании
    initializeFromReservation: (scope: string, code: string | null | undefined, percentage: number) => void;
};

type PromoCodeStore = {
    // Карта состояний по скоупам: один флоу — один ключ
    scopes: Record<string, PromoScopeState>;
} & PromoCodeActions;

/**
 * Пустое состояние скоупа. Единый экспортируемый объект (а не фабрика) — чтобы
 * селекторы вида `s.scopes[key] ?? EMPTY_PROMO_SCOPE_STATE` возвращали стабильную
 * ссылку и не вызывали лишние ре-рендеры потребителей.
 */
export const EMPTY_PROMO_SCOPE_STATE: PromoScopeState = {
    promoCodeInput: "",
    appliedPromoCode: "",
    promoCodePercentage: 0,
    promoCodeMessage: "",
    promoCodeValid: false,
};

// Копия пустого состояния для записи в новые скоупы — константа остается нетронутой
const emptyScopeState = (): PromoScopeState => ({ ...EMPTY_PROMO_SCOPE_STATE });

// Безопасное чтение скоупа внутри экшенов: несуществующий скоуп = пустое состояние
const scopeOf = (state: Pick<PromoCodeStore, "scopes">, scope: string): PromoScopeState =>
    state.scopes[scope] ?? emptyScopeState();

export const usePromoCodeStore = create<PromoCodeStore>((set) => ({
    scopes: {},

    // Actions
    setPromoCodeInput: (scope, code) => set((state) => ({
        scopes: {
            ...state.scopes,
            [scope]: {
                ...scopeOf(state, scope),
                promoCodeInput: code,
                promoCodeMessage: "", // Сбрасываем сообщение при новом вводе
                promoCodeValid: false,
            },
        },
    })),

    // "Применение" - это фиксация введенного кода для расчетов
    applyPromoCode: (scope) => set((state) => {
        const current = scopeOf(state, scope);
        return {
            scopes: {
                ...state.scopes,
                [scope]: { ...current, appliedPromoCode: current.promoCodeInput },
            },
        };
    }),

    setPromoCodeResult: (scope, percentage, message, valid) => set((state) => ({
        scopes: {
            ...state.scopes,
            [scope]: {
                ...scopeOf(state, scope),
                promoCodePercentage: percentage,
                promoCodeMessage: message,
                promoCodeValid: valid,
            },
        },
    })),

    removePromoCode: (scope) => {
        set((state) => ({
            scopes: { ...state.scopes, [scope]: emptyScopeState() },
        }));
        toast.info("Промокод сброшен.");
    },

    clearPromoCode: (scope) => set((state) => ({
        scopes: { ...state.scopes, [scope]: emptyScopeState() },
    })),

    initializeFromReservation: (scope, code, percentage) => {
        const promoCodeStr = code || "";
        set((state) => ({
            scopes: {
                ...state.scopes,
                [scope]: {
                    promoCodeInput: promoCodeStr,
                    appliedPromoCode: promoCodeStr,
                    promoCodePercentage: percentage,
                    promoCodeMessage: percentage > 0 ? "Промокод успешно применен!" : "",
                    // Валидным считаем примененный код с фактической скидкой из резерва
                    promoCodeValid: Boolean(promoCodeStr) && percentage > 0,
                },
            },
        }));
    },
}));
