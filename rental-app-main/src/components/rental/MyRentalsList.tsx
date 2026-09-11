// src/components/rental/MyRentalsList.tsx

import React, { useMemo } from "react";
import SharedErrorState from "@/components/shared/ErrorState";
import type { InfiniteData } from "@tanstack/react-query";
import type { AdminRentalOut, AdminRentalListResponse } from "@/types/rental";
import { useMyRentals } from "@/hooks/useMyRentals";
import MyRentalCard from "./MyRentalCard";
import { RefreshCw, Truck } from "lucide-react";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { applyHideCompletedFilter } from "@/lib/filterUtils";
import type { RefObject } from "react";
import EmptyStateWithActions, { useEmptyStateActions } from "../shared/EmptyStateWithActions";

interface MyRentalsListProps {
    getHighlightClasses: (id: number) => string;
    elementRef: RefObject<HTMLDivElement | null>;
    highlightId?: number | null;
    rentalsData?: InfiniteData<AdminRentalListResponse> | undefined;
}

const LoadingState = () => (
    <div className="text-center py-8">
        <div className="flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600" />
        </div>
        <p className="text-gray-600">Загрузка аренд...</p>
    </div>
);


const EmptyState = () => {
    const { goToEquipmentSelection, goToHowItWorks } = useEmptyStateActions();
    
    return (
        <EmptyStateWithActions
            icon={Truck}
            title="Нет аренд"
            description="Сначала создайте новый резерв (перейдите к выбору оборудования) и приходите за оборудованием в дату начала резерва."
            primaryAction={{
                label: "Перейти к выбору оборудования",
                onClick: goToEquipmentSelection,
                variant: "default"
            }}
            secondaryAction={{
                label: "Как это работает",
                onClick: goToHowItWorks,
                variant: "outline"
            }}
        />
    );
};

const MyRentalsListComponent = ({ 
    getHighlightClasses, 
    elementRef, 
    highlightId, 
    rentalsData: propRentalsData 
}: MyRentalsListProps) => {
    const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useMyRentals({}, 10);
    const { statusFilter } = useOrderFilterStore();

    // Используем данные из пропсов или загружаем их самостоятельно
    const allRentals = useMemo(() => {
        let rentals: AdminRentalOut[] = [];

        if (propRentalsData?.pages) {
            const flatList = propRentalsData.pages.flatMap((page) => page?.items || []);
            rentals = flatList.filter((item) => item && item.id);
        } else if (data?.pages) {
            const flatList = data.pages.flatMap((page) => page?.items || []);
            rentals = flatList.filter((item) => item && item.id);
        }

        // Применяем централизованный фильтр "скрыть завершенные" для аренд
        rentals = applyHideCompletedFilter(rentals, statusFilter, 'rental');

        return rentals;
    }, [propRentalsData, data, statusFilter]);

    // Условные возвраты после всех хуков
    if (isLoading) {
        return <LoadingState />;
    }

    if (isError) {
        return (
            <SharedErrorState
                message={error?.message || "Ошибка при загрузке аренд"}
                onRetry={() => void refetch()}
            />
        );
    }

    if (allRentals.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="space-y-4">
            {/* Список аренд */}
            <div className="space-y-4">
                {allRentals.map((rental) => (
                    <div
                        key={rental.id}
                        ref={highlightId === rental.id ? elementRef : null}
                        className={getHighlightClasses(rental.id)}
                    >
                        <MyRentalCard 
                            rental={rental} 
                        />
                    </div>
                ))}
            </div>

            <InfiniteScrollTrigger
                fetchNextPage={fetchNextPage}
                hasNextPage={!!hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
            />
        </div>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(MyRentalsListComponent);
