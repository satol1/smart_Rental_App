// src/hooks/data/useEquipmentData.ts

import { useMemo, useCallback } from "react";
import { useEquipment } from "@/hooks/useEquipment";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { useDailyAvailability } from "@/hooks/useDailyAvailability";
import { useReserveStore } from "@/store/reserveStore";
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo, DailyAvailabilityData } from "@/types/availability";

export interface EquipmentFilters {
    query?: string;
    type?: string;
    associationId?: number;
    availableOnly?: boolean;
    startDate?: Date;
    endDate?: Date;
}

export interface UseEquipmentDataReturn {
    equipment: Equipment[];
    totalEquipmentCount: number;
    availabilityData: AvailabilityInfo[];
    dailyAvailabilityData: DailyAvailabilityData | undefined;
    isLoading: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void;
    getEquipmentData: (equipmentId: number) => {
        equipment: Equipment | undefined;
        availability: AvailabilityInfo | undefined;
        dailyStatus: Record<string, any> | undefined;
    };
}

export const useEquipmentData = (filters: EquipmentFilters): UseEquipmentDataReturn => {
    const { addToReservationMode } = useReserveStore();

    // Загружаем пагинированный список оборудования
    const {
        data: equipmentPages,
        fetchNextPage,
        hasNextPage,
        isLoading,
        isFetchingNextPage
    } = useEquipment(filters);

    // Извлекаем плоский массив оборудования
    const equipment = useMemo(() =>
        equipmentPages?.pages.flatMap(page => page.items) ?? [],
        [equipmentPages]
    );

    const totalEquipmentCount = equipmentPages?.pages[0]?.total ?? 0;

    // Собираем все ID оборудования, включая то, что находится в пачках
    const allEquipmentIds = useMemo(() => {
        const equipmentIds = equipment.map(item => item.id);
        const packEquipmentIds = equipmentPages?.pages.flatMap(page => 
            page.packs?.flatMap(pack => pack.equipment_ids) || []
        ) || [];
        
        // Объединяем и убираем дубликаты
        const allIds = [...new Set([...equipmentIds, ...packEquipmentIds])];
        return allIds;
    }, [equipment, equipmentPages]);

    // Загружаем данные о доступности для всего оборудования, включая пачки
    const { availabilityMap } = useAvailabilityCheck({
        equipmentIds: allEquipmentIds,
        startDate: filters.startDate || new Date(),
        endDate: filters.endDate || new Date(),
        excludeReservationId: addToReservationMode || undefined,
        enabled: !!(filters.startDate && filters.endDate && allEquipmentIds.length > 0)
    });

    // Преобразуем availabilityMap обратно в массив для совместимости
    const availabilityData = useMemo(() => 
        Object.values(availabilityMap), 
        [availabilityMap]
    );

    // Загружаем данные о ежедневной доступности для ВСЕГО оборудования (включая пачки)
    const thirtyDaysFromNow = useMemo(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), []);
    
    const { data: dailyAvailabilityData } = useDailyAvailability({
        ids: allEquipmentIds,
        start: new Date(),
        end: thirtyDaysFromNow,
    });

    // Функция для получения данных о конкретном оборудовании
    const getEquipmentData = useCallback((equipmentId: number) => {
        const equipmentItem = equipment.find(eq => eq.id === equipmentId);
        const availability = availabilityMap[equipmentId];
        const dailyStatus = dailyAvailabilityData?.[equipmentId];
        
        return {
            equipment: equipmentItem,
            availability,
            dailyStatus
        };
    }, [equipment, availabilityMap, dailyAvailabilityData]);

    return {
        equipment,
        totalEquipmentCount,
        availabilityData,
        dailyAvailabilityData,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
        getEquipmentData
    };
};

