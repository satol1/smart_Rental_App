// hooks/admin/useAdminRentalEdit.ts

import { useMemo, useState } from "react";
import { useUpdateAdminRental } from "@/hooks/useAdminRentals";
import { useRentalEditForm } from "./useRentalEditForm";
import { usePriceCalculator } from "../reservation/usePriceCalculator";
import { useRentalEditDataPreparation } from "./useRentalEditDataPreparation";
import { formatDate } from "@/lib/utils";
import type { AdminRentalOut } from "@/types/rental";
import type { RentalEditFormData } from "./useRentalEditForm";

interface UseAdminRentalEditProps {
    rental: AdminRentalOut;
    onSuccess: () => void;
}

/**
 * Главный хук для редактирования аренды администратором.
 * Координирует работу специализированных хуков.
 * Следует принципу Single Responsibility - только координация.
 */
export function useAdminRentalEdit({ rental, onSuccess }: UseAdminRentalEditProps) {
    const updateMutation = useUpdateAdminRental();
    
    // Управление формой
    const { register, handleSubmit, watch, setValue, formState, holidayError, isHolidayValid } = useRentalEditForm({ rental });
    const { errors, isValid, isDirty } = formState;
    
    // Отслеживаем изменения для перерасчета стоимости
    const watchedEndDate = watch("end_date");
    const watchedPromoCode = watch("promo_code");
    
    const equipmentIds = useMemo(() => rental.equipment.map(eq => eq.id), [rental.equipment]);
    
    // Состояние для отслеживания примененного промокода (как в других частях приложения)
    const [appliedPromoCode, setAppliedPromoCode] = useState<string>("");
    
    // Пересчет стоимости для активных аренд
    const shouldRecalculate = ['active', 'overdue'].includes(rental.status) && 
        (watchedEndDate !== formatDate(rental.end_date) || appliedPromoCode);
    
    const selectedAccessories = useMemo(() => {
        const accessories: Record<number, number[]> = {};
        rental.accessory_links?.forEach(link => {
            if (!accessories[link.equipment_id]) {
                accessories[link.equipment_id] = [];
            }
            accessories[link.equipment_id].push(link.accessory.id);
        });
        return accessories;
    }, [rental.accessory_links]);

    const priceCalculator = usePriceCalculator({
        equipmentIds,
        startDate: new Date(rental.start_date),
        endDate: watchedEndDate ? new Date(watchedEndDate) : new Date(rental.end_date),
        selectedAccessories,
        promoCode: appliedPromoCode || undefined, // Используем примененный промокод, а не введенный
        enabled: Boolean(shouldRecalculate && equipmentIds.length > 0)
    });
    
    // Подготовка данных
    const { prepareUpdateData } = useRentalEditDataPreparation({ rental });

    const onSubmit = (data: RentalEditFormData) => {
        const updateData = prepareUpdateData(data);
        
        updateMutation.mutate({
            rentalId: rental.id,
            data: updateData
        }, {
            onSuccess: () => {
                onSuccess(); // Закрываем форму редактирования
            }
        });
    };

    return {
        register,
        handleSubmit: handleSubmit(onSubmit),
        errors,
        isValid: isValid && isHolidayValid, // Учитываем валидацию выходных
        isDirty,
        isSaving: updateMutation.isPending,
        // Валидация выходных дней
        holidayError,
        isHolidayValid,
        // Данные для FinancialSummaryBlock
        priceDetails: shouldRecalculate ? priceCalculator.data : null,
        isCalculatingPrice: priceCalculator.isLoading,
        // Функции для промокода (как в других частях приложения)
        promoCode: watchedPromoCode || "",
        setPromoCode: (code: string) => setValue("promo_code", code),
        applyPromoCode: () => {
            // Применяем промокод только после нажатия кнопки "Применить"
            setAppliedPromoCode(watchedPromoCode || "");
        },
        removePromoCode: () => {
            setValue("promo_code", "");
            setAppliedPromoCode("");
        },
        promoCodeMessage: priceCalculator.promoCodeMessage || "",
        // Структурный флаг успеха: примененный код + скидка из расчета бэкенда (задача 1.5)
        promoCodeValid: Boolean(appliedPromoCode) && priceCalculator.promoDiscountPercentage > 0,
        isApplyingPromoCode: priceCalculator.isApplyingPromoCode,
    };
}