// src/hooks/useAvailabilityForEquipment.ts
import { useMemo } from "react";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { useDailyAvailability } from "@/hooks/useDailyAvailability";
import { useReserveStore } from "@/store/reserveStore";
import { useDateStore } from "@/store/dateStore";
/**
 * Хук для получения данных о доступности оборудования.
 * Используется отдельно от фильтрации оборудования.
 */
export const useAvailabilityForEquipment = (equipment) => {
    const { addToReservationMode } = useReserveStore();
    const { startDate, endDate } = useDateStore();
    // Если даты не выбраны, используем текущую дату как fallback
    const effectiveStartDate = startDate || new Date();
    const effectiveEndDate = endDate || new Date();
    // Загружаем данные о доступности для всего оборудования
    const { availabilityMap } = useAvailabilityCheck({
        equipmentIds: equipment.map(e => e.id),
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
        excludeReservationId: addToReservationMode || undefined,
        enabled: !!(equipment.length > 0)
    });
    // Преобразуем availabilityMap обратно в массив для совместимости
    const availabilityData = useMemo(() => Object.values(availabilityMap), [availabilityMap]);
    // Загружаем данные о ежедневной доступности для видимых элементов
    const thirtyDaysFromNow = useMemo(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), []);
    const { data: dailyAvailabilityData } = useDailyAvailability({
        ids: equipment.map(item => item.id),
        start: new Date(),
        end: thirtyDaysFromNow,
    });
    return {
        availabilityData,
        dailyAvailabilityData
    };
};
