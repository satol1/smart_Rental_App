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
import type { AdminReservationOut } from "@/types/reservation";
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
    const [conversionTarget, setConversionTarget] = useState<AdminReservationOut | null>(null);
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
        const state = location.state as { statusFilterOverride?: string } | null;
        if (state?.statusFilterOverride) {
            setStatusFilter(state.statusFilterOverride);
            setSearchQuery(""); // Сбрасываем поиск для чистоты
        }
    }, [location.state, setStatusFilter, setSearchQuery]);

    const {
        data,
        isLoading: isLoadingReservations,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useAdminReservations({
        search: searchQuery,
        status: statusFilter === "all" ? undefined : (statusFilter as "active" | "completed" | "fulfilled" | "cancelled" | "overdue" | null),
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
        if (selectedIds.length === 0) return;
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

    return (
        <div className="rental-container space-y-6 py-6">
            <AdminNavigation />

            <div className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-indigo-600" />
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Управление резервами
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Просмотр, создание и редактирование всех резервов в системе.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex flex-col xl:flex-row items-center justify-between gap-4">
                <div className="w-full flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <OrderToolbar context="admin-reservations" embedded />
                    </div>
                    <PeriodFilter />
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Создать резерв
                </Button>
            </div>

            <AdminReservationToolbar
                visibleReservationIds={visibleReservationIds}
                onBulkDelete={handleBulkDelete}
                isDeleting={bulkDeleteMutation.isPending}
            />

            <div className="space-y-4">
                {isLoading && <SkeletonTable rows={6} columns={6} />}
                {isFetchingNextPage && <p className="text-center text-blue-600 py-2 text-sm">Поиск резерва в следующих страницах...</p>}
                {error && <p className="text-center text-red-600 py-4">Ошибка загрузки данных: {error.message}</p>}

                {!isLoading && !error && allReservations.length === 0 && (
                    <div className="flex flex-col items-center justify-center text-center p-12 space-y-4 bg-gray-50/50 rounded-lg border-2 border-dashed">
                        <ClipboardX className="w-16 h-16 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-800">Резервы не найдены</h3>
                        <p className="text-sm text-gray-500">Попробуйте изменить фильтры или создайте новый резерв.</p>
                    </div>
                )}

                {!isLoading && !error && allReservations.length > 0 && (
                    <AllReservationsList
                        reservations={allReservations}
                        onConvertToRental={setConversionTarget}
                        equipmentMap={equipmentMap}
                        getHighlightClasses={getHighlightClasses}
                        elementRef={elementRef}
                        highlightId={highlightState.id}
                    />
                )}
                
                <InfiniteScrollTrigger
                    fetchNextPage={fetchNextPage}
                    hasNextPage={!!hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                />
            </div>

            <CreateReservationDialog
                isOpen={isCreateDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
            />
            <ConvertReservationDialog
                reservation={conversionTarget}
                open={!!conversionTarget}
                onClose={() => setConversionTarget(null)}
                equipmentMap={equipmentMap}
            />

            <ConfirmationDialog
                open={isConfirmingDelete}
                onOpenChange={setConfirmingDelete}
                title="Подтвердите удаление"
                description={`Вы уверены, что хотите удалить ${selectedIds.length} резерв(ов)? Это действие нельзя отменить.`}
                confirmText="Да, удалить"
                cancelText="Отмена"
                onConfirm={confirmBulkDelete}
                variant="destructive"
            />

            <RentalReceiptDialog
                isOpen={isOpen}
                onClose={closeReceipt}
                rentalData={rentalData}
            />
        </div>
    );
}
