// src/components/catalog/EquipmentCatalog.tsx

import { useMemo } from "react";
import FilterPanel from "@/components/FilterPanel";
import EquipmentGrid from "@/components/EquipmentGrid";
import { useAppFilters } from "@/hooks/features/useAppFilters";
import { useServerFilters } from "@/hooks/features/useServerFilters";
import { useAvailabilityForEquipment } from "@/hooks/useAvailabilityForEquipment";
import { useReservationManagement } from "@/hooks/useReservationManagement";
import { useViewModeStore } from "@/store/viewModeStore";
import type { CatalogItem } from "@/types/pack";

interface EquipmentCatalogProps {
    editingReservationId?: number;
    intent?: string;
    onOpenPackDetails?: (pack: any) => void;
}

/**
 * Компонент каталога оборудования.
 * Инкапсулирует отображение и фильтрацию каталога оборудования.
 */
export default function EquipmentCatalog({ editingReservationId: _editingReservationId, intent: _intent, onOpenPackDetails }: EquipmentCatalogProps) {
    const { viewMode } = useViewModeStore();

    // 1. Получаем состояние фильтров
    const { reset: resetFilters } = useAppFilters();

    // 2. Используем новый хук для серверной умной фильтрации
    const {
        combinedItems,
        availableTypes,
        availableBrands,
        availableAssociations,
        hasActiveFilters,
        totalCount,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage
    } = useServerFilters();

    // 3. Извлекаем только оборудование из гетерогенного массива для availability
    const equipmentOnly = useMemo(() => {
        return combinedItems.filter(item => item.entity_type === 'equipment').map(item => ({
            id: item.id,
            equipment_type: item.equipment_type,
            brand: item.brand,
            name: item.name,
            serial_number: item.serial_number,
            condition: item.condition,
            daily_rate: item.daily_rate,
            notes: item.notes,
            description: item.description,
            last_maintenance: item.last_maintenance,
            image_url: item.image_url,
            image_urls: item.image_urls,
            short_description: item.short_description,
            accessories: item.accessories
        }));
    }, [combinedItems]);

    // 4. Вызываем хук для получения данных о доступности (только для оборудования)
    const {
        availabilityData,
        dailyAvailabilityData
    } = useAvailabilityForEquipment(equipmentOnly);

    // Создаем availabilityMap из availabilityData для useReservationManagement
    const availabilityMap = useMemo(() => {
        const map: Record<number, any> = {};
        availabilityData?.forEach((info) => {
            map[info.equipment_id] = info;
        });
        return map;
    }, [availabilityData]);

    // 5. Вызываем хук для логики управления резервами (только для оборудования)
    const {
        getEquipmentStatus
    } = useReservationManagement(equipmentOnly, availabilityMap, false);

    return (
        <>
            <FilterPanel 
                availableTypes={availableTypes}
                availableBrands={availableBrands}
                availableAssociations={availableAssociations}
                hasActiveFilters={hasActiveFilters}
            />

            <EquipmentGrid
                isLoading={isLoading}
                items={combinedItems}
                hasActiveFilters={hasActiveFilters}
                getEquipmentStatus={getEquipmentStatus}
                dailyAvailabilityData={dailyAvailabilityData}
                availabilityData={availabilityData}
                onResetFilters={resetFilters}
                viewMode={viewMode}
                onOpenPackDetails={onOpenPackDetails}
                // ✅ ИСПРАВЛЕНИЕ: Передаем правильные props для бесконечной загрузки
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
            />
        </>
    );
}
