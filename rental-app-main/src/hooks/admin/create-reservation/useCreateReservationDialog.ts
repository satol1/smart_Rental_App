// src/hooks/admin/create-reservation/useCreateReservationDialog.ts

import { useState, useEffect, useCallback } from "react";
import { useCreateAdminReservation } from "@/hooks/useAdminReservations";
import { useAdminReservationCalculator } from "../useAdminReservationCalculator";
import { formatDate } from "@/lib/utils";
import { useCreateReservationData } from "./useCreateReservationData";
import { useCreateReservationForm, type CreateReservationFormData } from "./useCreateReservationForm";
import { usePromoCodeStore, ADMIN_CREATE_RESERVATION_PROMO_SCOPE } from "@/store/promoCodeStore";
import { USER_STATUS } from "@/constants/userStatusConstants";

const todayDate = new Date();
const tomorrowDate = new Date();
tomorrowDate.setDate(todayDate.getDate() + 1);

/**
 * УПРОЩЕННЫЙ ХУК-ОРКЕСТРАТОР
 * Управляет состоянием диалога создания резерва, используя дочерние хуки для данных и расчетов.
 */
export const useCreateReservationDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    // 1. Состояние UI диалога
    const [step, setStep] = useState<'details' | 'accessories'>('details');
    const [equipmentSearch, setEquipmentSearch] = useState("");

    // 2. Управление формой через специализированный хук
    const { form, watch, trigger, handleSubmit, reset } = useCreateReservationForm();

    const watchedStartDate = watch("start_date");
    const watchedEndDate = watch("end_date");
    const watchedEquipmentIds = watch("equipment_ids");

    // 3. Получение данных через специализированный хук
    const {
        users,
        isLoadingUsers,
        allEquipment,
        isLoadingEquipment,
        filteredAndGroupedEquipment,
        availabilityMap,
        isLoadingAvailability,
        hasConflictsInSelection,
        equipmentWithAccessories,
    } = useCreateReservationData({
        equipmentSearch,
        watchedStartDate,
        watchedEndDate,
        watchedEquipmentIds,
    });

    // 4. Расчет финансов
    const financialData = useAdminReservationCalculator(watch, allEquipment);

    // 5. Промокод стор для сброса при закрытии (селектор действия — без подписки на состояние)
    const clearPromoCodeAction = usePromoCodeStore((s) => s.clearPromoCode);
    const clearPromoCode = useCallback(
        () => clearPromoCodeAction(ADMIN_CREATE_RESERVATION_PROMO_SCOPE),
        [clearPromoCodeAction]
    );

    // 6. Логика отправки формы
    const createReservationMutation = useCreateAdminReservation();

    const handleCloseDialog = useCallback(() => onClose(), [onClose]);

    const processSubmit = useCallback((data: CreateReservationFormData) => {
        if (hasConflictsInSelection) {
            alert("Нельзя создать резерв, так как в вашем выборе есть конфликтные позиции.");
            return;
        }
        
        // Проверка статуса пользователя перед отправкой
        const selectedUser = users.find(u => u.id === data.user_id);
        if (selectedUser) {
            if (selectedUser.status === USER_STATUS.PERSONA_NON_GRATA) {
                alert("Нельзя создать резерв для пользователя со статусом 'Персона НонГрата'.");
                return;
            }
        }
        
        // Добавляем промокод в payload, если он применен
        const payload = {
            ...data,
            ...(financialData.appliedPromoCode && { promo_code: financialData.appliedPromoCode })
        };
        
        createReservationMutation.mutate(payload, { onSuccess: handleCloseDialog });
    }, [hasConflictsInSelection, createReservationMutation, handleCloseDialog, financialData.appliedPromoCode, users]);

    const handleNextStep = useCallback(async () => {
        const isValid = await trigger(["user_id", "start_date", "end_date", "equipment_ids"]);
        if (!isValid) return;

        // Проверяем, есть ли у выбранного оборудования аксессуары
        const hasEquipmentWithAccessories = equipmentWithAccessories.some(eq => eq.accessories && eq.accessories.length > 0);
        
        if (hasEquipmentWithAccessories) {
            setStep('accessories');
        } else {
            // ✅ ИСПРАВЛЕНИЕ: Добавлено ключевое слово `await` для асинхронного вызова.
            await handleSubmit(processSubmit)();
        }
    }, [trigger, equipmentWithAccessories, handleSubmit, processSubmit]);

    // 7. Сброс состояния при закрытии диалога
    useEffect(() => {
        if (!isOpen) {
            reset({
                equipment_ids: [], 
                selected_accessories: {},
                start_date: formatDate(todayDate), 
                end_date: formatDate(tomorrowDate),
            });
            setEquipmentSearch("");
            setStep('details');
            clearPromoCode(); // Сбрасываем промокод при закрытии диалога
        }
    }, [isOpen, reset, clearPromoCode]);

    // 8. Возвращаем единый интерфейс для компонента
    return {
        step,
        form,
        isSubmitting: createReservationMutation.isPending,
        users,
        isLoadingUsers,
        allEquipment,
        isLoadingEquipment,
        equipmentSearch,
        setEquipmentSearch,
        filteredAndGroupedEquipment,
        equipmentWithAccessories,
        availabilityMap,
        isLoadingAvailability,
        hasConflictsInSelection,
        setStep,
        handleNextStep,
        onSubmit: handleSubmit(processSubmit),
        handleCloseDialog,
        financialData,
    };
};
