// path: rental-app-main/src/components/EquipmentGrid.tsx

import EquipmentCard from '@/components/equipment-card';
import CompactEquipmentCard from '@/components/CompactEquipmentCard';
import PackCard from '@/components/PackCard';
import CompactPackCard from '@/components/CompactPackCard';
import { Button } from "@/components/ui/button";
import { PackageSearch, FilterX } from "lucide-react";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo, DayStatus, EquipmentStatus } from "@/types/availability";
import type { ViewMode } from '@/store/viewModeStore';
import type { CatalogItem, CatalogEquipmentItem, CatalogPackItem } from '@/types/pack';

// Отдельный компонент для карточки оборудования в сетке
interface GridEquipmentCardProps {
    equipment: Equipment;
    status: EquipmentStatus | "my_reservation" | "added";
    startDate?: string;
    endDate?: string;
    dailyStatus?: Record<string, DayStatus>;
    viewMode: ViewMode;
}

const GridEquipmentCard: React.FC<GridEquipmentCardProps> = ({
    equipment,
    status,
    startDate,
    endDate,
    dailyStatus,
    viewMode
}) => {
    // Используем новый упрощенный API - передаем только необходимые данные
    const cardProps = {
        equipment,
        dailyStatus,
        status,
        startDate,
        endDate,
    };

    return viewMode === "compact" ? (
        <CompactEquipmentCard {...cardProps} />
    ) : (
        <EquipmentCard {...cardProps} />
    );
};

interface EquipmentGridProps {
    isLoading: boolean;
    items: CatalogItem[];
    hasActiveFilters: boolean;
    getEquipmentStatus: (eq: Equipment) => EquipmentStatus | "my_reservation" | "added";
    dailyAvailabilityData?: Record<number, Record<string, DayStatus>>;
    availabilityData?: AvailabilityInfo[];
    onResetFilters: () => void;
    viewMode: ViewMode;
    onOpenPackDetails?: (pack: CatalogPackItem) => void;
    // ✅ 2. Нам больше не нужен onShowMore, так как компонент сам управляет вызовом
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    fetchNextPage: () => void; // ✅ 3. Но нам нужна сама функция fetchNextPage
}

export default function EquipmentGrid({
    isLoading,
    items,
    hasActiveFilters,
    getEquipmentStatus,
    dailyAvailabilityData,
    availabilityData,
    onResetFilters,
    viewMode,
    onOpenPackDetails,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage, // ✅ 4. Получаем функцию
}: EquipmentGridProps) {

    // ✅ 5. Логика Intersection Observer полностью удалена отсюда.


    if (isLoading && items.length === 0) {
        return <p className="text-gray-500 text-sm col-span-full text-center py-5">Загрузка оборудования...</p>;
    }

    if (items.length === 0) {
        return (
            <div className="col-span-full my-8">
                <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 bg-gray-50/50 rounded-lg border-2 border-dashed">
                    {hasActiveFilters ? <FilterX className="w-16 h-16 text-gray-400" /> : <PackageSearch className="w-16 h-16 text-gray-400" />}
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-gray-800">{hasActiveFilters ? "Ничего не найдено" : "Каталог пока пуст"}</h3>
                        <p className="text-sm text-gray-500">{hasActiveFilters ? "Попробуйте изменить или сбросить фильтры." : "Здесь появится оборудование для аренды."}</p>
                    </div>
                    {hasActiveFilters && (
                        <div className="mt-4">
                            <Button variant="outline" onClick={onResetFilters}>
                                Сбросить фильтры
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const gridClasses = viewMode === "compact"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mt-4"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4";

    return (
        <>
            <div className={gridClasses}>
                {items.map((item) => {
                    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
                    if (item.entity_type === 'pack') {
                        // Если элемент - это пачка, рендерим компонент PackCard
                        const pack = item as CatalogPackItem;
                        return viewMode === "compact" ? (
                            <CompactPackCard 
                                key={`pack-${pack.id}`} 
                                pack={pack}
                                onOpenDetails={onOpenPackDetails}
                            />
                        ) : (
                            <PackCard 
                                key={`pack-${pack.id}`} 
                                pack={pack}
                                onOpenDetails={onOpenPackDetails}
                            />
                        );
                    }
                    // --- КОНЕЦ ИЗМЕНЕНИЙ ---

                    // Существующая логика для оборудования
                    const eq = item as CatalogEquipmentItem; // Приведение типа для TypeScript
                    const availability = availabilityData?.find(a => a.equipment_id === eq.id);
                    const equipmentDailyStatus = dailyAvailabilityData?.[eq.id];
                    const status = getEquipmentStatus(eq);

                    return (
                        <GridEquipmentCard
                            key={eq.id}
                            equipment={eq}
                            status={status}
                            startDate={availability?.start_date ?? undefined}
                            endDate={availability?.end_date ?? undefined}
                            dailyStatus={equipmentDailyStatus}
                            viewMode={viewMode}
                        />
                    );
                })}
            </div>

            {/* ✅ 6. Используем наш новый универсальный компонент */}
            <InfiniteScrollTrigger
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
            />
        </>
    );
}