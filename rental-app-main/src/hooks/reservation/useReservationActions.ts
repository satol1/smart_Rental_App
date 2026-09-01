// src/hooks/reservation/useReservationActions.ts

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useReserveStore } from "@/store/reserveStore";
import { useEditReservation } from "../useEditReservation";
import { ReservationService } from "@/core/services";
import { useCurrentUser } from "@/hooks/useProfile";
import { canUserEditReservation, USER_STATUS, mapLegacyUserStatus, type UserStatus } from "@/constants/userStatusConstants";
import type { Reservation } from "@/types/reservation";
import { type EditState } from "./useReservationState";

export function useReservationActions({
                                          reservation,
                                          state,
                                          hasConflicts,
                                          appliedPromoCode,
                                          onFullCancellation,
                                          isAdminContext,
                                          onFinishEditing, // ✨ 1. Принимаем колбэк
                                      }: {
    reservation: Reservation,
    state: EditState,
    hasConflicts: boolean,
    appliedPromoCode: string,
    onFullCancellation?: () => Promise<void> | void,
    isAdminContext: boolean,
    onFinishEditing: () => void; // ✨ 2. Добавляем его в тип
}) {
    const { clear: clearReserveStore } = useReserveStore();
    const { data: currentUser } = useCurrentUser();
    const editApiMutation = useEditReservation({
        onSuccessCallback: onFinishEditing,
        onClearState: clearReserveStore
    });

    const finalHasChanges = useMemo(() => {
        const promoCodeChanged = appliedPromoCode !== (reservation.promo_code || "");
        return state.hasChanges || promoCodeChanged;
    }, [state.hasChanges, appliedPromoCode, reservation.promo_code]);

    const saveChanges = useCallback(async (): Promise<boolean> => {
        if (!finalHasChanges) {
            toast.info("Нет изменений для сохранения.");
            return false;
        }
        if (hasConflicts) {
            toast.error("Невозможно сохранить резерв с конфликтами.");
            return false;
        }
        if (state.currentEquipmentDetails.length === 0) {
            toast.error("Резерв должен содержать хотя бы одну позицию.");
            return false;
        }

        // Проверка прав на редактирование (информативная, основная проверка на бэкенде)
        if (!isAdminContext && currentUser?.status) {
            const reservationStartDate = new Date(reservation.start_date);
            const now = new Date();
            const daysUntilStart = Math.ceil((reservationStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            // Используем маппинг старых статусов для обратной совместимости
            const userStatus = mapLegacyUserStatus(currentUser.status);
            
            if (userStatus && !canUserEditReservation(userStatus, daysUntilStart)) {
                toast.error("У вас нет прав на редактирование этого резерва. Обратитесь к менеджеру.");
                return false;
            }
        }

        try {
            await editApiMutation.mutateAsync({
                id: reservation.id,
                start_date: state.startDate.toISOString().split('T')[0],
                end_date: state.endDate.toISOString().split('T')[0],
                equipment_ids: state.currentEquipmentDetails.map(eq => eq.id),
                promo_code: appliedPromoCode || undefined,
                selected_accessories: state.localSelectedAccessories,
                isAdminContext,
            });
            // clearReserveStore() и onFinishEditing теперь вызываются в onSuccess колбэке мутации
            return true;
        } catch (error) {
            toast.error("Ошибка при сохранении изменений.");
            return false;
        }
    }, [
        reservation.id, reservation.start_date, state, finalHasChanges, hasConflicts,
        appliedPromoCode, editApiMutation, clearReserveStore, isAdminContext, onFinishEditing, currentUser
    ]);

    const [isCancelling, setIsCancelling] = useState(false);

    const handleConfirmFullCancellation = useCallback(async () => {
        if (!onFullCancellation) return;
        setIsCancelling(true);
        try {
            await onFullCancellation();
        } catch (error) {
            toast.error("Не удалось отменить резерв.");
        } finally {
            setIsCancelling(false);
        }
    }, [onFullCancellation]);

    return {
        saveChanges,
        isSaving: editApiMutation.isPending,
        handleConfirmFullCancellation,
        isCancelling,
        finalHasChanges,
    };
}