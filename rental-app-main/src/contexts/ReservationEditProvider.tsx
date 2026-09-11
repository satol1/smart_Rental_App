// src/contexts/ReservationEditProvider.tsx

import React, { useMemo } from "react";
import { useReservationEditState } from "@/hooks/reservation/useReservationEditState";
import { useReservationData } from "@/hooks/reservation/useReservationData";
import { useEditReservation } from "@/hooks/useEditReservation";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { useReserveStore } from "@/store/reserveStore";
import { ReservationEditContext, type ReservationEditContextValue } from "./ReservationEditContext";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { Reservation } from "@/types/reservation";
import type { EquipmentDisplayDetail } from "@/hooks/reservation/useReservationState";

import { isApiErrorLike } from "@/lib/queryHelpers";

interface ReservationEditProviderProps {
    children: React.ReactNode;
    reservation: Reservation;
    initialEquipmentForDisplay: ReadonlyArray<EquipmentDisplayDetail>;
    onFullCancellation?: (() => Promise<void> | void) | undefined;
    isAdminContext?: boolean;
    onFinishEditing: () => void;
}

export const ReservationEditProvider: React.FC<ReservationEditProviderProps> = ({
    children,
    reservation,
    initialEquipmentForDisplay,
    onFullCancellation,
    isAdminContext = false,
    onFinishEditing,
}) => {
    // Управление состоянием формы редактирования
    const { state, actions: stateActions, allEquipment, clearReserveStore } = useReservationEditState(
        reservation,
        initialEquipmentForDisplay
    );

    // Адаптер для совместимости с useReservationData
    const editStateForData = useMemo(() => ({
        startDate: state.startDate,
        endDate: state.endDate,
        originalEquipmentIds: state.originalEquipmentIds,
        currentEquipmentDetails: state.currentEquipmentDetails,
        newlyAddedEquipmentIds: state.newlyAddedEquipmentIds,
        localSelectedAccessories: state.localSelectedAccessories,
        hasChanges: state.hasChanges,
    }), [state]);

    // Получение данных (доступность, цены, промокоды)
    const {
        availabilityMap,
        hasConflicts,
        isCheckingAvailability,
        isCalculatingPrice,
        financials,
        setPromoCode,
        applyPromoCode,
        removePromoCode,
        appliedPromoCode,
        priceDetails,
        promoCode,
    } = useReservationData(reservation, editStateForData);

    // Валидация выходных дней
    const { isHolidayValid } = useHolidayValidation(state.startDate, state.endDate);

    // Мутация для сохранения изменений
    const editApiMutation = useEditReservation({
        onSuccessCallback: () => {
            stateActions.resetProcessedEquipmentAddition();
            onFinishEditing();
        },
        onClearState: () => {
            clearReserveStore();
        },
    });

    // Создание карты оборудования
    const equipmentMap = useMemo(() => new Map(allEquipment.map(e => [e.id, e])), [allEquipment]);

    // Вычисление финального состояния изменений
    const promoCodeChanged = appliedPromoCode !== (reservation.promo_code || "");
    const finalHasChanges = useMemo(() => {
        return state.hasChanges || promoCodeChanged;
    }, [state.hasChanges, promoCodeChanged]);

    // Функция сохранения изменений
    const saveChanges = async (confirmAdjustment: boolean = false): Promise<boolean> => {
        if (!finalHasChanges && !confirmAdjustment) {
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
        if (!isHolidayValid && !confirmAdjustment) {
            toast.error("Нельзя сохранить резерв с датами, выпадающими на выходные дни.");
            return false;
        }

        try {
            // Фильтруем аксессуары, оставляя только те, которые относятся к оставшемуся оборудованию
            const currentEquipmentIds = new Set(state.currentEquipmentDetails.map(eq => eq.id));
            const filteredAccessories = Object.fromEntries(
                Object.entries(state.localSelectedAccessories).filter(([equipmentId]) => 
                    currentEquipmentIds.has(Number(equipmentId))
                )
            );

            await editApiMutation.mutateAsync({
                id: reservation.id,
                start_date: formatDate(state.startDate),
                end_date: formatDate(state.endDate),
                equipment_ids: state.currentEquipmentDetails.map(eq => eq.id),
                // undefined (ключ уходит из JSON) — промокод не меняли, бэкенд
                // сохраняет действующий; null — явный сброс промокода
                promo_code: promoCodeChanged ? (appliedPromoCode || null) : undefined,
                selected_accessories: filteredAccessories,
                isAdminContext,
                confirm_date_adjustment: confirmAdjustment,
            });
            if (state.holidayConflict) {
                stateActions.setHolidayConflict(null);
            }
            return true;
        } catch (error) {
            if (isApiErrorLike(error) && error.response?.status === 409) {
                const errorDetail = error.response?.data?.detail;
                if (
                    typeof errorDetail === "object" &&
                    errorDetail !== null &&
                    !Array.isArray(errorDetail) &&
                    errorDetail.error_type === "DATE_IS_HOLIDAY" &&
                    typeof errorDetail.message === "string" &&
                    typeof errorDetail.suggested_end_date === "string"
                ) {
                    stateActions.setHolidayConflict({
                        message: errorDetail.message,
                        suggested_end_date: errorDetail.suggested_end_date,
                    });
                }
            }
            return false;
        }
    };

    // Обработчики событий
    const handleConfirmHolidayAdjustment = () => { void saveChanges(true); };
    const { setReservationId } = useReserveStore.getState();
    const cancelEdit = () => { stateActions.clearReserveStoreAndReset(); onFinishEditing(); };

    // Подготовка состояния для UI
    const editStateForUI = useMemo(() => ({
        ...state,
        hasChanges: finalHasChanges,
        newlyAddedEquipmentIdsAsArray: Array.from(state.newlyAddedEquipmentIds)
    }), [state, finalHasChanges]);

    // Создание значения контекста
    const contextValue: ReservationEditContextValue = {
        reservationId: reservation.id,
        reservationCreatedAt: reservation.created_at,
        editState: editStateForUI,
        availabilityMap,
        hasConflicts,
        isLoading: editApiMutation.isPending || isCheckingAvailability,
        isCheckingAvailability,
        isSaving: editApiMutation.isPending,
        isCalculatingPrice,
        isCancelling: false,
        isCancelConfirmationVisible: false, // Управляется в EditableReservationCard
        isAdminContext,
        startEdit: () => setReservationId(reservation.id),
        cancelEdit,
        saveChanges: () => saveChanges(false),
        equipmentMap,
        allEquipment,
        updateDates: stateActions.updateDates,
        addEquipmentItems: stateActions.addEquipmentItems,
        removeEquipmentItem: stateActions.removeEquipmentItem,
        handleConfirmFullCancellation: async () => {
            if (onFullCancellation) await onFullCancellation();
        },
        handleCloseCancellationDialog: () => {
            // Логика закрытия диалога отмены
        },
        financials,
        priceDetails,
        promoCode,
        setPromoCode,
        applyPromoCode,
        removePromoCode,
        localSelectedAccessories: state.localSelectedAccessories,
        toggleAccessory: stateActions.toggleAccessory,
        holidayConflict: state.holidayConflict,
        confirmHolidayAdjustment: handleConfirmHolidayAdjustment,
        cancelHolidayAdjustment: () => stateActions.setHolidayConflict(null),
        isHolidayValid,
    };

    return (
        <ReservationEditContext.Provider value={contextValue}>
            {children}
        </ReservationEditContext.Provider>
    );
};
