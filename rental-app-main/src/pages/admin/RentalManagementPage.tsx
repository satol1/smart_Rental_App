// src/pages/admin/RentalManagementPage.tsx

import { useState, useMemo } from "react";
import SharedErrorState from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Truck, Plus } from "lucide-react";
import { useAdminRentals } from "@/hooks/useAdminRentals";
import AllRentalsList from "@/components/admin/AllRentalsList";
import ReturnRentalDialog from "@/components/admin/ReturnRentalDialog";
import CreateRentalFromScratchDialog from "@/components/admin/CreateRentalFromScratchDialog";
import RentalReceiptDialog from "@/components/admin/RentalReceiptDialog";
import type { AdminRentalOut } from "@/types/rental";
import OrderToolbar from "@/components/shared/OrderToolbar";
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { useDebounce } from "@/hooks/useDebounce";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import { useHighlightLogic } from "@/hooks/useHighlightLogic";
import { useRentalReceiptStore } from "@/store/rentalReceiptStore";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { SkeletonTable } from "@/components/ui/skeleton-list";



export default function RentalManagementPage() {
    const [returnTarget, setReturnTarget] = useState<AdminRentalOut | null>(null);
    const [isCreateRentalOpen, setCreateRentalOpen] = useState(false);

    // Получаем параметры фильтрации из стора (поиск — с debounce)
    const { searchQuery: rawSearchQuery, statusFilter, periodType, periodOffset } = useOrderFilterStore();
    const searchQuery = useDebounce(rawSearchQuery, 350);
    
    // Получаем состояние диалога бланка аренды
    const { isOpen, rentalData, closeReceipt } = useRentalReceiptStore();

    // Используем хук для обработки подсветки
    const { highlightState, getHighlightClasses, elementRef } = useHighlightLogic();

    const {
        data,
        isLoading,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useAdminRentals({
        search: searchQuery,
        status: statusFilter === "all" ? undefined : (statusFilter as "active" | "overdue" | "completed" | null),
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

    return (
        <div className="space-y-6">

            <div className="flex items-center gap-3">
                <Truck className="w-8 h-8 text-warning" />
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Управление Арендами
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Просмотр, создание и завершение физической выдачи оборудования.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex flex-col xl:flex-row items-center justify-between gap-4">
                <div className="w-full flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <OrderToolbar context="admin-rentals" embedded />
                    </div>
                    <PeriodFilter />
                </div>
                <Button onClick={() => setCreateRentalOpen(true)} className="w-full md:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Создать аренду
                </Button>
            </div>

            <div className="space-y-4">
                {isLoading && <SkeletonTable rows={6} columns={6} />}
                {error && <SharedErrorState message={`Ошибка загрузки данных: ${error.message}`} onRetry={() => void refetch()} compact />}
                {!isLoading && !error && allRentals.length > 0 && (
                    <AllRentalsList 
                        rentals={allRentals} 
                        onReturn={setReturnTarget} 
                        highlightId={highlightState.id}
                        elementRef={elementRef as React.RefObject<HTMLDivElement>}
                        getHighlightClasses={getHighlightClasses}
                    />
                )}
                
                <InfiniteScrollTrigger
                    fetchNextPage={fetchNextPage}
                    hasNextPage={!!hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                />
            </div>

            <ReturnRentalDialog
                rental={returnTarget}
                open={!!returnTarget}
                onClose={() => setReturnTarget(null)}
            />

            <CreateRentalFromScratchDialog
                open={isCreateRentalOpen}
                onClose={() => setCreateRentalOpen(false)}
            />

            <RentalReceiptDialog
                isOpen={isOpen}
                onClose={closeReceipt}
                rentalData={rentalData}
            />

        </div>
    );
}
