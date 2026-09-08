// src/hooks/useEquipmentMap.ts
import { useMemo } from "react";
/**
 * Хук для создания карты оборудования по ID из данных useInfiniteQuery
 * @param equipmentPages - Объект InfiniteData, возвращаемый хуком useEquipment
 * @returns Карта оборудования, где ключ - ID оборудования
 */
export const useEquipmentMap = (equipmentPages) => {
    return useMemo(() => {
        // ИЗМЕНЕНИЕ: "Разворачиваем" все страницы в один плоский массив `allEquipment`
        const allEquipment = equipmentPages?.pages.flatMap(page => page.items) ?? [];
        const map = {};
        // Теперь allEquipment - это правильный массив, и forEach будет работать
        allEquipment.forEach((e) => {
            map[e.id] = e;
        });
        return map;
    }, [equipmentPages]);
};
