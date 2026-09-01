// src/hooks/useAvailabilityCheck.ts

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AvailabilityService } from "@/core/services";
import type { AvailabilityInfo } from "@/types/availability";
import { handleQueryError } from "@/lib/queryHelpers";

export interface UseAvailabilityCheckProps {
    equipmentIds: number[];
    startDate: Date;
    endDate: Date;
    excludeReservationId?: number;
    enabled?: boolean;
}

export interface UseAvailabilityCheckReturn {
    isLoading: boolean;
    isError: boolean;
    availabilityMap: Record<number, AvailabilityInfo>;
    conflictingItemIds: number[];
    hasConflicts: boolean;
    error: Error | null;
}

/**
 * Центральный хук для проверки доступности оборудования.
 * Использует useQuery из @tanstack/react-query для получения и кэширования данных о доступности.
 * 
 * @param props - Параметры для проверки доступности
 * @returns Объект с данными о доступности и статусом загрузки
 */
export function useAvailabilityCheck({
    equipmentIds,
    startDate,
    endDate,
    excludeReservationId,
    enabled = true
}: UseAvailabilityCheckProps): UseAvailabilityCheckReturn {
    
    // Формируем уникальный queryKey на основе входных параметров
    const queryKey = useMemo(() => {
        const stringifiedIds = JSON.stringify([...equipmentIds].sort((a, b) => a - b));
        return [
            "availability-check",
            stringifiedIds,
            startDate.toISOString(),
            endDate.toISOString(),
            excludeReservationId
        ] as const;
    }, [equipmentIds, startDate, endDate, excludeReservationId]);

    // Проверяем валидность параметров
    const isParamsValid = useMemo(() => {
        return !!(
            equipmentIds.length > 0 &&
            startDate && !isNaN(startDate.getTime()) &&
            endDate && !isNaN(endDate.getTime()) &&
            startDate <= endDate
        );
    }, [equipmentIds, startDate, endDate]);

    const query = useQuery({
        queryKey,
        queryFn: async (): Promise<AvailabilityInfo[]> => {
            if (!isParamsValid) return [];
            
            try {
                return await AvailabilityService.getStatuses({
                    equipmentIds,
                    startDate,
                    endDate,
                    excludeReservationId
                });
            } catch (error: unknown) {
                console.error("[useAvailabilityCheck] Error fetching availability:", error);
                handleQueryError(error);
                throw error;
            }
        },
        enabled: enabled && isParamsValid,
        staleTime: 30 * 1000, // 30 секунд
        gcTime: 5 * 60 * 1000, // 5 минут
    });

    // Обрабатываем данные и создаем карту доступности
    const processedData = useMemo(() => {
        const availabilityData = query.data || [];
        
        // Создаем карту доступности для быстрого доступа
        const availabilityMap: Record<number, AvailabilityInfo> = {};
        availabilityData.forEach((info) => {
            availabilityMap[info.equipment_id] = info;
        });

        // Находим ID всех конфликтных позиций
        const conflictingItemIds = availabilityData
            .filter(info => info.status === "reserved" || info.status === "rented")
            .map(info => info.equipment_id);

        return {
            availabilityMap,
            conflictingItemIds,
            hasConflicts: conflictingItemIds.length > 0
        };
    }, [query.data]);

    return {
        isLoading: query.isLoading,
        isError: query.isError,
        availabilityMap: processedData.availabilityMap,
        conflictingItemIds: processedData.conflictingItemIds,
        hasConflicts: processedData.hasConflicts,
        error: query.error
    };
}
