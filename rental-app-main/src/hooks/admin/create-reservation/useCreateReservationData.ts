// src/hooks/admin/create-reservation/useCreateReservationData.ts

import { useMemo } from "react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { useDebounce } from "@/hooks/useDebounce";
import { EquipmentService } from "@/core/services";
import type { Equipment } from "@/types/equipment";

interface UseCreateReservationDataInputs {
    equipmentSearch: string;
    watchedStartDate: string;
    watchedEndDate: string;
    watchedEquipmentIds: number[];
    /** Строка поиска пользователя (серверный поиск с debounce) */
    userSearch?: string;
}

/**
 * Хук для получения и обработки данных для формы создания резерва.
 * Содержит всю логику получения данных: пользователи, оборудование, доступность.
 */
export const useCreateReservationData = ({
    equipmentSearch,
    watchedStartDate,
    watchedEndDate,
    watchedEquipmentIds,
    userSearch = "",
}: UseCreateReservationDataInputs) => {

    // 1. Загрузка исходных данных (поиск пользователей — на сервере, с debounce)
    const debouncedUserSearch = useDebounce(userSearch.trim(), 350);
    const {
        data: usersResponse,
        isLoading: isLoadingUsers,
        hasNextPage: usersHasNextPage,
        fetchNextPage: usersFetchNextPage,
        isFetchingNextPage: usersIsFetchingNextPage,
    } = useAdminUsers(debouncedUserSearch || undefined);
    const { data: allEquipment = [], isLoading: isLoadingEquipment } = useAllEquipment();

    const users = useMemo(() =>
        usersResponse?.pages?.flatMap(page => page.items) ?? [],
        [usersResponse]
    );

    // 3. Фильтрация и группировка оборудования
    const filteredAndGroupedEquipment = useMemo(() => {
        return EquipmentService.filterAndGroupEquipment(allEquipment, equipmentSearch);
    }, [allEquipment, equipmentSearch]);

    // 4. Проверка доступности отфильтрованного оборудования
    const { validStartDate, validEndDate } = useMemo(() => {
        const start = watchedStartDate ? new Date(watchedStartDate) : null;
        const end = watchedEndDate ? new Date(watchedEndDate) : null;
        return {
            validStartDate: start && !isNaN(start.getTime()) ? start : null,
            validEndDate: end && !isNaN(end.getTime()) ? end : null,
        }
    }, [watchedStartDate, watchedEndDate]);

    // Проверка доступности для отображения в списке (все видимое оборудование)
    const { 
        availabilityMap, 
        isLoading: isLoadingAvailability 
    } = useAvailabilityCheck({
        equipmentIds: filteredAndGroupedEquipment.visibleIds,
        startDate: validStartDate || new Date(),
        endDate: validEndDate || new Date(),
        enabled: !!(validStartDate && validEndDate && filteredAndGroupedEquipment.visibleIds.length > 0)
    });

    // Проверка конфликтов только для выбранного оборудования
    const { 
        hasConflicts: hasConflictsInSelection 
    } = useAvailabilityCheck({
        equipmentIds: watchedEquipmentIds,
        startDate: validStartDate || new Date(),
        endDate: validEndDate || new Date(),
        enabled: !!(validStartDate && validEndDate && watchedEquipmentIds.length > 0)
    });

    // Вспомогательная функция для получения выбранного оборудования
    const getSelectedEquipment = (allEq: Equipment[], ids: number[]): Equipment[] => {
        const selectedIds = new Set(ids);
        return allEq.filter(eq => selectedIds.has(eq.id));
    };

    const selectedEquipment = useMemo(() => getSelectedEquipment(allEquipment, watchedEquipmentIds), [watchedEquipmentIds, allEquipment]);

    return {
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
        equipmentWithAccessories: selectedEquipment
    };
};
