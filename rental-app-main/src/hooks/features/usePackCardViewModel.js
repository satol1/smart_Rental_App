// rental-app-main/src/hooks/features/usePackCardViewModel.ts
import { useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useReserveStore } from "@/store/reserveStore";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { usePackPriceCalculator } from "@/hooks/usePackPriceCalculator";
export const usePackCardViewModel = (pack) => {
    const { add, remove, items } = useReserveStore(); // Получаем items напрямую для реактивности
    const { data: allEquipment = [] } = useAllEquipment();
    // Шаг 1: Получаем все детали расчета цены
    const { priceDetails, isCalculatingPrice } = usePackPriceCalculator(pack);
    const cheapestItem = useMemo(() => {
        if (!pack.cheapest_available_id)
            return null;
        return allEquipment.find(eq => eq.id === pack.cheapest_available_id) || null;
    }, [pack.cheapest_available_id, allEquipment]);
    // ✅ ИСПРАВЛЕНИЕ: Используем items напрямую для реактивности
    const isAddedToReserve = useMemo(() => {
        if (!cheapestItem)
            return false;
        return items.some(item => item.id === cheapestItem.id);
    }, [cheapestItem, items]); // items - это реактивное состояние из Zustand
    const handleReserveAction = useCallback((e) => {
        e.stopPropagation();
        if (!cheapestItem) {
            toast.error("Нет доступного оборудования в этой пачке для резерва.");
            return;
        }
        if (isAddedToReserve) {
            remove(cheapestItem.id);
            toast.info(`"${cheapestItem.name}" убран из резерва.`);
        }
        else {
            add(cheapestItem);
            toast.success(`"${cheapestItem.name}" добавлен в резерв.`);
        }
    }, [cheapestItem, isAddedToReserve, add, remove]);
    const isAvailable = pack.available_count > 0 && !!cheapestItem;
    // Шаг 2: Формируем все необходимые пропсы для UI
    return {
        isAvailable,
        isAddedToReserve,
        priceDetails,
        isLoadingPrice: isCalculatingPrice,
        handleReserveAction,
        buttonText: isAddedToReserve ? "✔ Добавлено" : "В резерв 1 шт",
        buttonVariant: (isAddedToReserve ? "secondary" : "default")
    };
};
