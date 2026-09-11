// src/contexts/ReservationEditContext.tsx

import { createContext, useContext } from 'react';
import type { AvailabilityInfo } from '@/types/availability';
import type { ReservationEditState } from '@/hooks/reservation/useReservationEditState';
import type { Equipment } from '@/types/equipment'; // ✅ Добавлен импорт
import type { PriceDetails } from '@/hooks/reservation/usePriceCalculator';

export type ReservationEditContextValue = {
    reservationId: number;
    /** Момент создания резерва (ISO) — для grace-периода отмены/редактирования */
    reservationCreatedAt?: string | null;
    editState: ReservationEditState & { newlyAddedEquipmentIdsAsArray: number[] };
    availabilityMap: Record<number, AvailabilityInfo>;
    hasConflicts: boolean;
    isLoading: boolean;
    isCheckingAvailability: boolean;
    isSaving: boolean;
    isCalculatingPrice: boolean;
    isCancelling: boolean;
    isCancelConfirmationVisible: boolean;
    isAdminContext: boolean;
    startEdit: () => void;
    cancelEdit: () => void;
    saveChanges: () => Promise<boolean | void>;
    // ✅ ДОБАВЛЕНЫ ЭТИ ДВА СВОЙСТВА
    equipmentMap: Map<number, Equipment>;
    allEquipment: Equipment[];
    updateDates: (newStartDate: Date, newEndDate: Date) => void;
    addEquipmentItems: (itemsToAdd: Equipment[]) => void;
    removeEquipmentItem: (idToRemove: number) => void;
    handleConfirmFullCancellation: () => Promise<void>;
    handleCloseCancellationDialog: () => void;
    financials: {
        dayCount: number;
        fullTotal: number;
        finalTotal: number;
        discountAmount: number;
        durationDiscountAmount: number;
        durationDiscountPercentage: number;
        promoDiscountAmount: number;
        promoCodePercentage: number;
        promoCodeMessage: string;
        // Структурный флаг успеха применения промокода
        promoCodeValid: boolean;
        promoCode: string;
    };
    priceDetails?: PriceDetails | null; // Добавляем priceDetails из usePriceCalculator
    promoCode: string;
    setPromoCode: (code: string) => void;
    applyPromoCode: () => void;
    removePromoCode: () => void;
    localSelectedAccessories: Record<number, number[]>;
    toggleAccessory: (equipmentId: number, accessoryId: number) => void;
    holidayConflict: { message: string, suggested_end_date: string } | null;
    confirmHolidayAdjustment: () => void;
    cancelHolidayAdjustment: () => void;
    isHolidayValid: boolean;
};

export const ReservationEditContext = createContext<ReservationEditContextValue | null>(null);

export const useReservationEditContext = () => {
    const context = useContext(ReservationEditContext);
    if (!context) {
        throw new Error('useReservationEditContext must be used within a ReservationEditProvider');
    }
    return context;
};