import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/admin/RentalManagementPage.tsx
import { useState, useMemo } from "react";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Truck, Plus } from "lucide-react";
import { useAdminRentals } from "@/hooks/useAdminRentals";
import AllRentalsList from "@/components/admin/AllRentalsList";
import ReturnRentalDialog from "@/components/admin/ReturnRentalDialog";
import CreateRentalFromScratchDialog from "@/components/admin/CreateRentalFromScratchDialog";
import RentalReceiptDialog from "@/components/admin/RentalReceiptDialog";
import OrderToolbar from "@/components/shared/OrderToolbar";
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import { useHighlightLogic } from "@/hooks/useHighlightLogic";
import { useRentalReceiptStore } from "@/store/rentalReceiptStore";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { SkeletonTable } from "@/components/ui/skeleton-list";
export default function RentalManagementPage() {
    const [returnTarget, setReturnTarget] = useState(null);
    const [isCreateRentalOpen, setCreateRentalOpen] = useState(false);
    // Получаем параметры фильтрации из стора
    const { searchQuery, statusFilter, periodType, periodOffset } = useOrderFilterStore();
    // Получаем состояние диалога бланка аренды
    const { isOpen, rentalData, closeReceipt } = useRentalReceiptStore();
    // Используем хук для обработки подсветки
    const { highlightState, getHighlightClasses, elementRef } = useHighlightLogic();
    const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminRentals({
        search: searchQuery,
        status: statusFilter === "all" ? undefined : statusFilter,
        periodType: periodType || undefined,
        periodOffset
    });
    const allRentals = useMemo(() => {
        if (!data?.pages) {
            return [];
        }
        // Безопасно "разворачиваем" страницы в один массив
        const flatList = data.pages.flatMap(page => page.items || []);
        // Фильтруем массив, чтобы убрать любые невалидные записи
        return flatList.filter(item => item && item.id);
    }, [data]);
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Truck, { className: "w-8 h-8 text-orange-600" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0410\u0440\u0435\u043D\u0434\u0430\u043C\u0438" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440, \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u0435 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043A\u043E\u0439 \u0432\u044B\u0434\u0430\u0447\u0438 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F." })] })] }), _jsxs("div", { className: "bg-white rounded-lg border shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4", children: [_jsxs("div", { className: "w-full flex flex-col md:flex-row gap-4", children: [_jsx("div", { className: "flex-1", children: _jsx(OrderToolbar, { context: "admin-rentals" }) }), _jsx(PeriodFilter, {})] }), _jsxs(Button, { onClick: () => setCreateRentalOpen(true), className: "w-full md:w-auto", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u0440\u0435\u043D\u0434\u0443"] })] }), _jsxs("div", { className: "bg-white rounded-lg border shadow-sm p-4 md:p-6", children: [isLoading && _jsx(SkeletonTable, { rows: 6, columns: 6 }), error && _jsxs("p", { className: "text-center text-red-600 py-4", children: ["\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445: ", error.message] }), !isLoading && !error && allRentals.length > 0 && (_jsx(AllRentalsList, { rentals: allRentals, onReturn: setReturnTarget, highlightId: highlightState.id, elementRef: elementRef, getHighlightClasses: getHighlightClasses })), _jsx(InfiniteScrollTrigger, { fetchNextPage: fetchNextPage, hasNextPage: !!hasNextPage, isFetchingNextPage: isFetchingNextPage })] }), _jsx(ReturnRentalDialog, { rental: returnTarget, open: !!returnTarget, onClose: () => setReturnTarget(null) }), _jsx(CreateRentalFromScratchDialog, { open: isCreateRentalOpen, onClose: () => setCreateRentalOpen(false) }), _jsx(RentalReceiptDialog, { isOpen: isOpen, onClose: closeReceipt, rentalData: rentalData })] }));
}
