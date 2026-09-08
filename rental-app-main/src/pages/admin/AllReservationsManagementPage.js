import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/admin/AllReservationsManagementPage.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { useAdminReservations, useBulkDeleteAdminReservations } from "@/hooks/useAdminReservations";
import { useHighlightLogic } from "@/hooks/useHighlightLogic";
import { useAutoLoaderForItem } from "@/hooks/useAutoLoaderForItem";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, ClipboardX } from "lucide-react";
import AllReservationsList from "@/components/admin/AllReservationsList";
import CreateReservationDialog from "@/components/admin/CreateReservationDialog";
import ConvertReservationDialog from "@/components/admin/ConvertReservationDialog";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useAdminReservationSelectionStore } from "@/store/adminReservationSelectionStore";
import { AdminReservationToolbar } from "@/components/admin/AdminReservationToolbar";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import OrderToolbar from "@/components/shared/OrderToolbar";
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import { transformAccessoryLinks } from "@/lib/utils";
import { useRentalReceiptStore } from "@/store/rentalReceiptStore";
import RentalReceiptDialog from "@/components/admin/RentalReceiptDialog";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { SkeletonTable } from "@/components/ui/skeleton-list";
export default function AllReservationsManagementPage() {
    const location = useLocation();
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [conversionTarget, setConversionTarget] = useState(null);
    const [isConfirmingDelete, setConfirmingDelete] = useState(false);
    // Получаем состояние модального окна бланка аренды
    const { isOpen, rentalData, closeReceipt } = useRentalReceiptStore();
    // Получаем параметры фильтрации из стора
    const searchQuery = useOrderFilterStore(state => state.searchQuery);
    const statusFilter = useOrderFilterStore(state => state.statusFilter);
    const periodType = useOrderFilterStore(state => state.periodType);
    const periodOffset = useOrderFilterStore(state => state.periodOffset);
    const setSearchQuery = useOrderFilterStore(state => state.setSearchQuery);
    const setStatusFilter = useOrderFilterStore(state => state.setStatusFilter);
    // Обработка состояния, переданного при навигации
    useEffect(() => {
        const state = location.state;
        if (state?.statusFilterOverride) {
            setStatusFilter(state.statusFilterOverride);
            setSearchQuery(""); // Сбрасываем поиск для чистоты
        }
    }, [location.state, setStatusFilter, setSearchQuery]);
    const { data, isLoading: isLoadingReservations, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminReservations({
        search: searchQuery,
        status: statusFilter === "all" ? undefined : statusFilter,
        periodType: periodType || undefined,
        periodOffset
    });
    const { data: allEquipment = [], isLoading: isLoadingEquipment } = useAllEquipment();
    const selectedIds = useAdminReservationSelectionStore(state => state.selectedIds);
    const clearSelection = useAdminReservationSelectionStore(state => state.clearSelection);
    const bulkDeleteMutation = useBulkDeleteAdminReservations();
    useEffect(() => {
        return () => {
            clearSelection();
        };
    }, []);
    const equipmentMap = useMemo(() => {
        return new Map(allEquipment.map(e => [e.id, e]));
    }, [allEquipment]);
    const allReservations = useMemo(() => {
        const flatList = data?.pages.flatMap(page => page.items || []) ?? [];
        const uniqueItems = Array.from(new Map(flatList.map(item => [item.id, item])).values());
        return uniqueItems.map(transformAccessoryLinks);
    }, [data]);
    const visibleReservationIds = useMemo(() => allReservations.map(r => r.id), [allReservations]);
    // 1. Получаем состояние подсветки
    const { highlightState, getHighlightClasses, elementRef } = useHighlightLogic();
    // 2. Запускаем авто-загрузчик
    useAutoLoaderForItem({
        items: allReservations,
        targetId: highlightState.id,
        hasNextPage: !!hasNextPage,
        isFetching: isFetchingNextPage,
        fetchNextPage
    });
    const isLoading = isLoadingReservations || isLoadingEquipment;
    const handleBulkDelete = useCallback(() => {
        if (selectedIds.length === 0)
            return;
        setConfirmingDelete(true);
    }, [selectedIds.length]);
    const confirmBulkDelete = useCallback(() => {
        bulkDeleteMutation.mutate(selectedIds, {
            onSuccess: () => {
                clearSelection();
                setConfirmingDelete(false);
            },
            onError: () => {
                setConfirmingDelete(false);
            }
        });
    }, [bulkDeleteMutation, selectedIds, clearSelection]);
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(ClipboardList, { className: "w-8 h-8 text-indigo-600" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u0430\u043C\u0438" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440, \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0432\u0441\u0435\u0445 \u0440\u0435\u0437\u0435\u0440\u0432\u043E\u0432 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0435." })] })] }), _jsxs("div", { className: "bg-white rounded-lg border shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4", children: [_jsxs("div", { className: "w-full flex flex-col md:flex-row gap-4", children: [_jsx("div", { className: "flex-1", children: _jsx(OrderToolbar, { context: "admin-reservations" }) }), _jsx(PeriodFilter, {})] }), _jsxs(Button, { onClick: () => setCreateDialogOpen(true), className: "w-full md:w-auto", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432"] })] }), _jsx(AdminReservationToolbar, { visibleReservationIds: visibleReservationIds, onBulkDelete: handleBulkDelete, isDeleting: bulkDeleteMutation.isPending }), _jsxs("div", { className: "bg-white rounded-lg border shadow-sm p-4 md:p-6", children: [isLoading && _jsx(SkeletonTable, { rows: 6, columns: 6 }), isFetchingNextPage && _jsx("p", { className: "text-center text-blue-600 py-2 text-sm", children: "\u041F\u043E\u0438\u0441\u043A \u0440\u0435\u0437\u0435\u0440\u0432\u0430 \u0432 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430\u0445..." }), error && _jsxs("p", { className: "text-center text-red-600 py-4", children: ["\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445: ", error.message] }), !isLoading && !error && allReservations.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center text-center p-12 space-y-4 bg-gray-50/50 rounded-lg border-2 border-dashed", children: [_jsx(ClipboardX, { className: "w-16 h-16 text-gray-400" }), _jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "\u0420\u0435\u0437\u0435\u0440\u0432\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), _jsx("p", { className: "text-sm text-gray-500", children: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u0440\u0435\u0437\u0435\u0440\u0432." })] })), !isLoading && !error && allReservations.length > 0 && (_jsx(AllReservationsList, { reservations: allReservations, onConvertToRental: setConversionTarget, equipmentMap: equipmentMap, getHighlightClasses: getHighlightClasses, elementRef: elementRef, highlightId: highlightState.id })), _jsx(InfiniteScrollTrigger, { fetchNextPage: fetchNextPage, hasNextPage: !!hasNextPage, isFetchingNextPage: isFetchingNextPage })] }), _jsx(CreateReservationDialog, { isOpen: isCreateDialogOpen, onClose: () => setCreateDialogOpen(false) }), _jsx(ConvertReservationDialog, { reservation: conversionTarget, open: !!conversionTarget, onClose: () => setConversionTarget(null), equipmentMap: equipmentMap }), _jsx(ConfirmationDialog, { open: isConfirmingDelete, onOpenChange: setConfirmingDelete, title: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435", description: `Вы уверены, что хотите удалить ${selectedIds.length} резерв(ов)? Это действие нельзя отменить.`, confirmText: "\u0414\u0430, \u0443\u0434\u0430\u043B\u0438\u0442\u044C", cancelText: "\u041E\u0442\u043C\u0435\u043D\u0430", onConfirm: confirmBulkDelete, variant: "destructive" }), _jsx(RentalReceiptDialog, { isOpen: isOpen, onClose: closeReceipt, rentalData: rentalData })] }));
}
