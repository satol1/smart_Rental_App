// src/hooks/admin/useCreateRentalFromScratchDialog.ts

import { useState, useEffect, useCallback } from "react";
import { useCreateAdminRentalFromScratch } from "@/hooks/useAdminRentals";
import { useAdminReservationCalculator } from "./useAdminReservationCalculator";
import { formatDate } from "@/lib/utils";
import { useCreateReservationData } from "./create-reservation/useCreateReservationData";
import { useCreateReservationForm, type CreateReservationFormData } from "./create-reservation/useCreateReservationForm";
import { usePromoCodeStore, ADMIN_CREATE_RENTAL_PROMO_SCOPE, EMPTY_PROMO_SCOPE_STATE } from "@/store/promoCodeStore";
import type { RentalCreateFromScratchData } from "@/types/rental";

const todayDate = new Date();
const tomorrowDate = new Date();
tomorrowDate.setDate(todayDate.getDate() + 1);

/**
 * ХУК-ОРКЕСТРАТОР ДЛЯ СОЗДАНИЯ АРЕНДЫ С НУЛЯ
 * Управляет состоянием диалога создания аренды, используя дочерние хуки для данных и расчетов.
 */
export const useCreateRentalFromScratchDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    // 1. Состояние UI диалога
    const [step, setStep] = useState<'details' | 'finalization'>('details');
    const [equipmentSearch, setEquipmentSearch] = useState("");
    const [userSearch, setUserSearch] = useState("");
    
    // Состояние для отслеживания новых позиций при переходе между шагами
    const [newlyAddedIds, setNewlyAddedIds] = useState<Set<number>>(new Set());
    // Состояние для отслеживания уже "увиденных" позиций на шаге финализации
    const [seenEquipmentIds, setSeenEquipmentIds] = useState<Set<number>>(new Set());

    // 2. Управление формой через специализированный хук
    const { form, watch, trigger, handleSubmit, reset } = useCreateReservationForm();

    const watchedStartDate = watch("start_date");
    const watchedEndDate = watch("end_date");
    const watchedEquipmentIds = watch("equipment_ids");

    // 3. Получение данных через специализированный хук
    const {
        users,
        isLoadingUsers,
        usersHasNextPage,
        usersFetchNextPage,
        usersIsFetchingNextPage,
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
        userSearch,
    });

    // 4. Расчет финансов (промокод — в скоупе создания аренды, отдельном от диалога резерва)
    const financialData = useAdminReservationCalculator(watch, allEquipment, ADMIN_CREATE_RENTAL_PROMO_SCOPE);

    // 5. Промокод стор для работы с промокодами
    const {
        promoCodeInput,
        promoCodeMessage,
    } = usePromoCodeStore((s) => s.scopes[ADMIN_CREATE_RENTAL_PROMO_SCOPE] ?? EMPTY_PROMO_SCOPE_STATE);
    const setPromoCodeInputAction = usePromoCodeStore((s) => s.setPromoCodeInput);
    const applyPromoCodeAction = usePromoCodeStore((s) => s.applyPromoCode);
    const removePromoCodeAction = usePromoCodeStore((s) => s.removePromoCode);
    const clearPromoCodeAction = usePromoCodeStore((s) => s.clearPromoCode);

    // Привязываем действия стора к скоупу создания аренды
    const setPromoCodeInput = useCallback(
        (code: string) => setPromoCodeInputAction(ADMIN_CREATE_RENTAL_PROMO_SCOPE, code),
        [setPromoCodeInputAction]
    );
    const applyPromoCode = useCallback(
        () => applyPromoCodeAction(ADMIN_CREATE_RENTAL_PROMO_SCOPE),
        [applyPromoCodeAction]
    );
    const removePromoCode = useCallback(
        () => removePromoCodeAction(ADMIN_CREATE_RENTAL_PROMO_SCOPE),
        [removePromoCodeAction]
    );
    const clearPromoCode = useCallback(
        () => clearPromoCodeAction(ADMIN_CREATE_RENTAL_PROMO_SCOPE),
        [clearPromoCodeAction]
    );

    // 6. Логика отправки формы
    const createRentalMutation = useCreateAdminRentalFromScratch();

    const handleCloseDialog = useCallback(() => onClose(), [onClose]);

    const processSubmit = useCallback((data: CreateReservationFormData) => {
        if (hasConflictsInSelection) {
            alert("Нельзя создать аренду, так как в вашем выборе есть конфликтные позиции.");
            return;
        }
        
        // Подготавливаем payload для создания аренды с нуля
        const payload: RentalCreateFromScratchData = {
            user_id: data.user_id,
            equipment_ids: data.equipment_ids,
            start_date: data.start_date,
            end_date: data.end_date,
            selected_accessories: data.selected_accessories,
            deposit_amount: data.deposit_amount || 0,
            prepayment_amount: data.prepayment_amount || 0,
            notes_on_issue: data.notes_on_issue || "",
            ...(financialData.appliedPromoCode && { promo_code: financialData.appliedPromoCode })
        };
        
        createRentalMutation.mutate(payload, { 
            onSuccess: () => {
                // Закрываем диалог создания аренды
                handleCloseDialog();
                // Логика открытия бланка аренды уже выполняется в onSuccess хука useCreateAdminRentalFromScratch
            }
        });
    }, [hasConflictsInSelection, createRentalMutation, handleCloseDialog, financialData.appliedPromoCode]);

    const handleNextStep = useCallback(async () => {
        const isValid = await trigger(["user_id", "start_date", "end_date", "equipment_ids"]);
        if (!isValid) return;

        // При переходе на финализацию определяем действительно новые позиции
        const currentEquipmentIds = form.getValues("equipment_ids") || [];
        const currentEquipmentSet = new Set(currentEquipmentIds);
        
        // Вычисляем разность между текущими позициями и уже "увиденными"
        const newEquipmentIds = new Set(
            currentEquipmentIds.filter(id => !seenEquipmentIds.has(id))
        );
        
        setNewlyAddedIds(newEquipmentIds);
        // Обновляем множество "увиденных" позиций
        setSeenEquipmentIds(currentEquipmentSet);

        setStep('finalization');
    }, [trigger, form, seenEquipmentIds]);

    const handleBackStep = useCallback(() => {
        // Очищаем состояние новых позиций при возврате на предыдущий шаг
        setNewlyAddedIds(new Set());
        setStep('details');
    }, []);

    const handleFinalSubmit = useCallback(async () => {
        const isValid = await trigger(["deposit_amount", "prepayment_amount", "notes_on_issue"]);
        if (!isValid) return;

        await handleSubmit(processSubmit)();
    }, [trigger, handleSubmit, processSubmit]);

    // 7. Сброс состояния при закрытии диалога
    useEffect(() => {
        if (!isOpen) {
            reset({
                equipment_ids: [], 
                selected_accessories: {},
                start_date: formatDate(todayDate), 
                end_date: formatDate(tomorrowDate),
                deposit_amount: 0,
                prepayment_amount: 0,
                notes_on_issue: ""
            });
            setEquipmentSearch("");
            setUserSearch("");
            setStep('details');
            clearPromoCode(); // Сбрасываем промокод при закрытии диалога
            
            // Сбрасываем состояние отслеживания новых позиций
            setNewlyAddedIds(new Set());
            setSeenEquipmentIds(new Set());
        }
    }, [isOpen, reset, clearPromoCode]);

    // 8. Возвращаем единый интерфейс для компонента
    return {
        step,
        form,
        isSubmitting: createRentalMutation.isPending,
        users,
        isLoadingUsers,
        userSearch,
        setUserSearch,
        usersHasNextPage,
        usersFetchNextPage,
        usersIsFetchingNextPage,
        equipmentSearch,
        setEquipmentSearch,
        isLoadingEquipment,
        filteredAndGroupedEquipment,
        equipmentWithAccessories,
        availabilityMap,
        isLoadingAvailability,
        hasConflictsInSelection,
        setStep,
        handleNextStep,
        handleBackStep,
        handleFinalSubmit,
        handleCloseDialog,
        financialData,
        newlyAddedIds, // Добавляем состояние новых позиций
        // Промокод пропсы
        promoCode: promoCodeInput,
        setPromoCode: setPromoCodeInput,
        applyPromoCode,
        removePromoCode,
        promoCodeMessage,
        promoCodeValid: financialData.promoCodeValid, // Структурный флаг успеха (задача 1.5)
    };
};
