import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/rental/MyRentalsList.tsx
import React, { useMemo } from "react";
import { useMyRentals } from "@/hooks/useMyRentals";
import MyRentalCard from "./MyRentalCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Truck } from "lucide-react";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { applyHideCompletedFilter } from "@/lib/filterUtils";
import EmptyStateWithActions, { useEmptyStateActions } from "../shared/EmptyStateWithActions";
const LoadingState = () => (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "flex items-center justify-center mb-4", children: _jsx(RefreshCw, { className: "w-8 h-8 animate-spin text-orange-600" }) }), _jsx("p", { className: "text-gray-600", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u0440\u0435\u043D\u0434..." })] }));
const ErrorState = ({ message, onRetry }) => (_jsxs("div", { className: "text-center py-8", children: [_jsx("div", { className: "flex items-center justify-center mb-4", children: _jsx(Truck, { className: "w-8 h-8 text-gray-400" }) }), _jsx("p", { className: "text-red-600 mb-4", children: message }), _jsxs(Button, { onClick: onRetry, variant: "outline", size: "sm", children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u043D\u043E\u0432\u0430"] })] }));
const EmptyState = () => {
    const { goToEquipmentSelection, goToHowItWorks } = useEmptyStateActions();
    return (_jsx(EmptyStateWithActions, { icon: Truck, title: "\u041D\u0435\u0442 \u0430\u0440\u0435\u043D\u0434", description: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0440\u0435\u0437\u0435\u0440\u0432 (\u043F\u0435\u0440\u0435\u0439\u0434\u0438\u0442\u0435 \u043A \u0432\u044B\u0431\u043E\u0440\u0443 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F) \u0438 \u043F\u0440\u0438\u0445\u043E\u0434\u0438\u0442\u0435 \u0437\u0430 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435\u043C \u0432 \u0434\u0430\u0442\u0443 \u043D\u0430\u0447\u0430\u043B\u0430 \u0440\u0435\u0437\u0435\u0440\u0432\u0430.", primaryAction: {
            label: "Перейти к выбору оборудования",
            onClick: goToEquipmentSelection,
            variant: "default"
        }, secondaryAction: {
            label: "Как это работает",
            onClick: goToHowItWorks,
            variant: "outline"
        } }));
};
const MyRentalsListComponent = ({ getHighlightClasses, elementRef, highlightId, rentalsData: propRentalsData }) => {
    const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useMyRentals({}, 10);
    const { statusFilter } = useOrderFilterStore();
    // Используем данные из пропсов или загружаем их самостоятельно
    const allRentals = useMemo(() => {
        let rentals = [];
        if (propRentalsData?.pages) {
            const flatList = propRentalsData.pages.flatMap((page) => page?.items || []);
            rentals = flatList.filter((item) => item && item.id);
        }
        else if (data?.pages) {
            const flatList = data.pages.flatMap((page) => page?.items || []);
            rentals = flatList.filter((item) => item && item.id);
        }
        // Применяем централизованный фильтр "скрыть завершенные" для аренд
        rentals = applyHideCompletedFilter(rentals, statusFilter, 'rental');
        return rentals;
    }, [propRentalsData, data, statusFilter]);
    // Условные возвраты после всех хуков
    if (isLoading) {
        return _jsx(LoadingState, {});
    }
    if (isError) {
        return (_jsx(ErrorState, { message: error?.message || "Ошибка при загрузке аренд", onRetry: () => refetch() }));
    }
    if (allRentals.length === 0) {
        return _jsx(EmptyState, {});
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "space-y-4", children: allRentals.map((rental) => (_jsx("div", { ref: highlightId === rental.id ? elementRef : null, className: getHighlightClasses(rental.id), children: _jsx(MyRentalCard, { rental: rental }) }, rental.id))) }), _jsx(InfiniteScrollTrigger, { fetchNextPage: fetchNextPage, hasNextPage: !!hasNextPage, isFetchingNextPage: isFetchingNextPage })] }));
};
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(MyRentalsListComponent);
