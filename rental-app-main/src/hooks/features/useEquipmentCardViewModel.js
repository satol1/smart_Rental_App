// src/hooks/features/useEquipmentCardViewModel.ts
import { useMemo, useCallback } from "react";
import { useReserveStore } from "@/store/reserveStore";
import { useDateStore } from "@/store/dateStore";
import { useSandboxCalculatorStore } from "@/store/sandboxCalculatorStore";
import { usePromoCodeStore } from "@/store/promoCodeStore";
import { useHolidayStore } from "@/store/holidayStore";
import { DateService } from "@/core/services/DateService";
import { toast } from "sonner";
import { format } from "date-fns";
import { combinedDiscountPercentage, MAX_COMBINED_DISCOUNT_PERCENT } from "@/constants/discount";
/**
 * Единый, контекстно-независимый хук для карточки оборудования.
 *
 * Этот хук инкапсулирует ВСЮ логику карточки оборудования:
 * - Проверка доступности оборудования (использует переданные данные)
 * - Работа с состоянием выбора
 * - Расчеты скидок и стоимости
 * - Обработчики событий
 * - Логика установки даты начала аренды
 *
 * Обеспечивает единый источник правды для состояния карточки,
 * независимо от того, где она отображается — в основном каталоге или в модальном окне.
 */
export const useEquipmentCardViewModel = (options) => {
    const { equipment, isSelected: externalIsSelected, onToggleSelection: externalOnToggleSelection, isAccessorySelected: externalIsAccessorySelected, onToggleAccessory: externalOnToggleAccessory, startDate: externalStartDate, endDate: externalEndDate, status: externalStatus, dailyStatus: externalDailyStatus } = options;
    // Получение данных из всех сторов
    const { toggle, items, toggleAccessory, isAccessorySelected, selectedAccessories } = useReserveStore();
    const { startDate: storeStartDate, endDate: storeEndDate, dayCount, setRange } = useDateStore();
    const { isCalculatorVisible, durationDiscountPercentage } = useSandboxCalculatorStore();
    const { promoCodePercentage } = usePromoCodeStore();
    const { holidays } = useHolidayStore();
    // Используем переданные даты или даты из стора
    // (finalStatus рассчитан ниже; даты потребуются при расширении ViewModel)
    void externalStartDate;
    void storeStartDate;
    void externalEndDate;
    void storeEndDate;
    // Определяем финальный статус (используем переданный или 'available' по умолчанию)
    const finalStatus = externalStatus || 'available';
    // Проверка выбранности оборудования - используем внешнее состояние если передано
    const isSelectedByUser = useMemo(() => {
        return externalIsSelected !== undefined ? externalIsSelected : items.some(item => item.id === equipment.id);
    }, [externalIsSelected, items, equipment.id]);
    // Расчет суточной стоимости аксессуаров
    const accessoriesDailyRate = useMemo(() => {
        const selectedForThisCard = selectedAccessories[equipment.id] || [];
        return equipment.accessories?.reduce((total, acc) => selectedForThisCard.includes(acc.id) ? total + acc.price : total, 0) ?? 0;
    }, [equipment.accessories, equipment.id, selectedAccessories]);
    // Расчет общей скидки
    const totalDiscountPercentage = useMemo(() => combinedDiscountPercentage(durationDiscountPercentage, promoCodePercentage), [durationDiscountPercentage, promoCodePercentage]);
    // Данные для отображения скидки
    const discountData = useMemo(() => {
        // Защита от некорректных значений
        const safeDayCount = Math.max(1, dayCount || 1);
        const safeTotalDiscountPercentage = Math.max(0, Math.min(MAX_COMBINED_DISCOUNT_PERCENT, totalDiscountPercentage || 0));
        const totalDailyRate = equipment.daily_rate + accessoriesDailyRate;
        const priceBefore = totalDailyRate * safeDayCount;
        return {
            days: safeDayCount,
            percentage: safeTotalDiscountPercentage,
            priceBefore,
            priceAfter: priceBefore * (1 - safeTotalDiscountPercentage / 100),
        };
    }, [equipment.daily_rate, accessoriesDailyRate, dayCount, totalDiscountPercentage]);
    // Обработчик переключения аксессуара
    const handleToggleAccessory = useCallback((equipmentId, accessoryId) => {
        if (externalOnToggleAccessory) {
            // Используем внешний обработчик
            externalOnToggleAccessory(equipmentId, accessoryId);
        }
        else {
            // Используем стандартную логику
            if (!isSelectedByUser)
                toggle(equipment);
            toggleAccessory(equipmentId, accessoryId);
        }
    }, [isSelectedByUser, toggle, equipment, toggleAccessory, externalOnToggleAccessory]);
    // Обработчик переключения выбора оборудования
    const handleToggleSelection = useCallback(() => {
        if (externalOnToggleSelection) {
            // Используем внешний обработчик
            externalOnToggleSelection(equipment);
        }
        else {
            // Используем стандартную логику
            toggle(equipment);
        }
    }, [toggle, equipment, externalOnToggleSelection]);
    // Функция проверки выбранности аксессуара
    const checkAccessorySelected = useCallback((equipmentId, accessoryId) => {
        if (externalIsAccessorySelected) {
            return externalIsAccessorySelected(equipmentId, accessoryId);
        }
        return isAccessorySelected(equipmentId, accessoryId);
    }, [externalIsAccessorySelected, isAccessorySelected]);
    // Централизованный обработчик установки даты начала
    const handleSetStartDate = useCallback((date) => {
        // Логика из AvailabilityStrip перенесена сюда
        const adjustedStartDate = DateService.adjustDateIfHoliday(date, holidays);
        const finalEndDate = DateService.findNextWorkingDay(adjustedStartDate, holidays, 1);
        if (adjustedStartDate.getTime() !== date.getTime()) {
            toast.info(`Дата начала сдвинута с ${format(date, 'dd.MM')} на ${format(adjustedStartDate, 'dd.MM')}, так как выбранный день — выходной.`);
        }
        // Устанавливаем даты в глобальное состояние
        setRange(adjustedStartDate, finalEndDate);
        // Добавляем оборудование в корзину, если оно еще не там
        if (!isSelectedByUser) {
            handleToggleSelection();
            toast.success(`"${equipment.name}" добавлен в резерв.`);
        }
        else {
            toast.info(`"${equipment.name}" уже в резерве.`);
        }
    }, [holidays, setRange, isSelectedByUser, handleToggleSelection, equipment.name]);
    // Возвращаем готовый объект пропсов
    return useMemo(() => ({
        // Основные данные
        equipment,
        status: finalStatus,
        startDate: externalStartDate ?
            (typeof externalStartDate === 'string' ? externalStartDate : externalStartDate.toISOString()) :
            undefined,
        endDate: externalEndDate ?
            (typeof externalEndDate === 'string' ? externalEndDate : externalEndDate.toISOString()) :
            undefined,
        dailyStatus: externalDailyStatus,
        // Состояние выбора
        isSelected: isSelectedByUser,
        onToggleSelection: handleToggleSelection,
        isAccessorySelected: checkAccessorySelected,
        onToggleAccessory: handleToggleAccessory,
        // Данные для отображения
        isCalculatorVisible,
        accessoriesDailyRate,
        totalDiscountPercentage,
        discountData,
        // Дополнительные функции
        handleSetStartDate
    }), [
        equipment,
        finalStatus,
        externalStartDate,
        externalEndDate,
        externalDailyStatus,
        isSelectedByUser,
        handleToggleSelection,
        checkAccessorySelected,
        handleToggleAccessory,
        isCalculatorVisible,
        accessoriesDailyRate,
        totalDiscountPercentage,
        discountData,
        handleSetStartDate
    ]);
};
