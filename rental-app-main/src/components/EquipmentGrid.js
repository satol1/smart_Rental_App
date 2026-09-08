import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// path: rental-app-main/src/components/EquipmentGrid.tsx
import { motion } from "framer-motion";
import EquipmentCard from '@/components/equipment-card';
import CompactEquipmentCard from '@/components/CompactEquipmentCard';
import PackCard from '@/components/PackCard';
import CompactPackCard from '@/components/CompactPackCard';
import { Button } from "@/components/ui/button";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { PackageSearch, FilterX } from "lucide-react";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import { listItem, staggerContainer } from "@/lib/motion";
const GridEquipmentCard = ({ equipment, status, startDate, endDate, dailyStatus, viewMode }) => {
    // Используем новый упрощенный API - передаем только необходимые данные
    const cardProps = {
        equipment,
        dailyStatus,
        status,
        startDate,
        endDate,
    };
    return viewMode === "compact" ? (_jsx(CompactEquipmentCard, { ...cardProps })) : (_jsx(EquipmentCard, { ...cardProps }));
};
/**
 * Обёртка карточки для каскадного появления и layout-анимации
 * добавления/удаления (только transform/opacity).
 */
const AnimatedGridItem = ({ children }) => (_jsx(motion.div, { variants: listItem, layout: true, children: children }));
export default function EquipmentGrid({ isLoading, items, hasActiveFilters, getEquipmentStatus, dailyAvailabilityData, availabilityData, onResetFilters, viewMode, onOpenPackDetails, isFetchingNextPage, hasNextPage, fetchNextPage, // ✅ 4. Получаем функцию
 }) {
    // ✅ 5. Логика Intersection Observer полностью удалена отсюда.
    if (isLoading && items.length === 0) {
        return (_jsx(SkeletonList, { count: 8, compact: viewMode === "compact", className: "mt-4" }));
    }
    if (items.length === 0) {
        return (_jsx("div", { className: "col-span-full my-8", children: _jsxs("div", { className: "flex flex-col items-center justify-center text-center p-8 space-y-4 bg-muted/50 rounded-lg border-2 border-dashed", children: [hasActiveFilters ? _jsx(FilterX, { className: "w-16 h-16 text-muted-foreground" }) : _jsx(PackageSearch, { className: "w-16 h-16 text-muted-foreground" }), _jsxs("div", { className: "space-y-1", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground", children: hasActiveFilters ? "Ничего не найдено" : "Каталог пока пуст" }), _jsx("p", { className: "text-sm text-muted-foreground", children: hasActiveFilters ? "Попробуйте изменить или сбросить фильтры." : "Здесь появится оборудование для аренды." })] }), hasActiveFilters && (_jsx("div", { className: "mt-4", children: _jsx(Button, { variant: "outline", onClick: onResetFilters, children: "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B" }) }))] }) }));
    }
    const gridClasses = viewMode === "compact"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 mt-4"
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-4";
    return (_jsxs(_Fragment, { children: [_jsx(motion.div, { className: gridClasses, variants: staggerContainer, initial: "hidden", animate: "visible", children: items.map((item) => {
                    // --- НАЧАЛО ИЗМЕНЕНИЙ ---
                    if (item.entity_type === 'pack') {
                        // Если элемент - это пачка, рендерим компонент PackCard
                        const pack = item;
                        return (_jsx(AnimatedGridItem, { children: viewMode === "compact" ? (_jsx(CompactPackCard, { pack: pack, onOpenDetails: onOpenPackDetails })) : (_jsx(PackCard, { pack: pack, onOpenDetails: onOpenPackDetails })) }, `pack-${pack.id}`));
                    }
                    // --- КОНЕЦ ИЗМЕНЕНИЙ ---
                    // Существующая логика для оборудования
                    const eq = item; // Приведение типа для TypeScript
                    const availability = availabilityData?.find(a => a.equipment_id === eq.id);
                    const equipmentDailyStatus = dailyAvailabilityData?.[eq.id];
                    const status = getEquipmentStatus(eq);
                    return (_jsx(AnimatedGridItem, { children: _jsx(GridEquipmentCard, { equipment: eq, status: status, startDate: availability?.start_date ?? undefined, endDate: availability?.end_date ?? undefined, dailyStatus: equipmentDailyStatus, viewMode: viewMode }) }, eq.id));
                }) }), _jsx(InfiniteScrollTrigger, { fetchNextPage: fetchNextPage, hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage })] }));
}
