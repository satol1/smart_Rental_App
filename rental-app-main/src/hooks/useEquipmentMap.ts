// src/hooks/useEquipmentMap.ts

import { useMemo } from "react";
import type { Equipment } from "@/types/equipment";
import type { InfiniteData } from "@tanstack/react-query";
import type { EquipmentListResponse } from "@/core/services";
import { isEquipmentItem } from "@/types/catalog";

/**
 * Хук для создания карты оборудования по ID из данных useInfiniteQuery
 * @param equipmentPages - Объект InfiniteData, возвращаемый хуком useEquipment
 * @returns Карта оборудования, где ключ - ID оборудования
 */
export const useEquipmentMap = (equipmentPages: InfiniteData<EquipmentListResponse, unknown> | undefined) => {
    return useMemo(() => {
        // ИЗМЕНЕНИЕ: "Разворачиваем" все страницы в один плоский массив `allEquipment`.
        // items — union каталога (оборудование + пачки), карте нужны только Equipment.
        const allEquipment = equipmentPages?.pages.flatMap(page => page.items.filter(isEquipmentItem)) ?? [];

        const map: Record<number, Equipment> = {};
        // Теперь allEquipment - это правильный массив, и forEach будет работать
        allEquipment.forEach((e: Equipment) => {
            map[e.id] = e;
        });
        return map;
    }, [equipmentPages]);
};