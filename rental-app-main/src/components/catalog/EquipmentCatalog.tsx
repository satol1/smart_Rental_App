// src/components/catalog/EquipmentCatalog.tsx

import { useMemo, type ReactNode } from "react";
import { useTranslation } from 'react-i18next';
import ViewModeToggle from '@/components/ViewModeToggle';
import type { AvailabilityInfo } from '@/types/availability';
import FilterPanel from "@/components/FilterPanel";
import EquipmentGrid from "@/components/EquipmentGrid";
import { useAppFilters } from "@/hooks/features/useAppFilters";
import { useServerFilters } from "@/hooks/features/useServerFilters";
import { useAvailabilityForEquipment } from "@/hooks/useAvailabilityForEquipment";
import { useReservationManagement } from "@/hooks/useReservationManagement";
import { useViewModeStore } from "@/store/viewModeStore";
import type { CatalogPackItem } from "@/types/pack";

interface EquipmentCatalogProps {
    collections?: ReactNode;
    editingReservationId?: number;
    intent?: string;
    onOpenPackDetails?: (pack: CatalogPackItem) => void;
}

/**
 * Компонент каталога оборудования.
 * Инкапсулирует отображение и фильтрацию каталога оборудования.
 */
export default function EquipmentCatalog({ onOpenPackDetails, collections }: EquipmentCatalogProps) {
    const { t } = useTranslation();
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
        const map: Record<number, AvailabilityInfo> = {};
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
        <section id="equipment-catalog" className="catalog-workspace" tabIndex={-1} aria-labelledby="catalog-heading">
            <div className="catalog-toolbar">
                <div className="flex flex-wrap items-baseline gap-3">
                    <h2 id="catalog-heading" className="text-2xl font-semibold tracking-tight">{t('catalogDesign.catalog')}</h2>
                    <span className="text-sm text-muted-foreground" role="status">{!isLoading && t('catalogDesign.catalogCount', { count: totalCount })}</span>
                </div>
                <ViewModeToggle />
            </div>
            <FilterPanel 
                availableTypes={availableTypes}
                availableBrands={availableBrands}
                availableAssociations={availableAssociations}
                hasActiveFilters={hasActiveFilters}
            />

            {!hasActiveFilters && collections}

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
        </section>
    );
}
