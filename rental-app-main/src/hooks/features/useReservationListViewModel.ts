// rental-app-main/src/hooks/features/useReservationListViewModel.ts

import { useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { useReservations } from "@/hooks/useReservations";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useReserveStore } from "@/store/reserveStore";
import { useDateStore } from "@/store/dateStore";
import { ReservationService } from "@/core/services";
import type { Equipment } from "@/types/equipment";
import type { ReservationWithNames } from "@/types/reservation";
import { useOrderFilters } from "@/store/orderFilterStore";
import { applyHideCompletedFilter } from "@/lib/filterUtils";

// Интерфейс опций теперь не нужен, так как хук не принимает данные извне
export interface ReservationListViewModelResult {
    reservationsWithNames: ReservationWithNames[];
    equipmentMap: Record<number, Equipment>;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
    /** Infinite-пагинация «Мои резервы» (этап 5.4) */
    hasNextPage: boolean;
    fetchNextPage: () => void;
    isFetchingNextPage: boolean;
    deletingId: number | null;
    itemToRemove: { reservationId: number; equipmentId: number } | null;
    /** Резерв, для которого открыт диалог подтверждения полной отмены */
    reservationToCancel: number | null;
    cancelReservation: (id: number) => Promise<void>;
    removeItemFromReservation: (reservationId: number, equipmentId: number) => Promise<void>;
    repeatReservation: (reservation: ReservationWithNames) => void;
    handleConfirmRemoval: () => Promise<void>;
    handleCancelRemoval: () => void;
    requestCancelReservation: (id: number) => void;
    handleConfirmCancellation: () => Promise<void>;
    handleCancelCancellation: () => void;
    isConfirmingCancellation: boolean;
    isRemovingItem: boolean;
}

/**
 * ViewModel-хук для управления списком резервов.
 * Инкапсулирует ВСЮ логику: получение данных, фильтрацию, обработку действий.
 */
export const useReservationListViewModel = (): ReservationListViewModelResult => {
    // 1. Получаем параметры фильтрации из zustand store (поиск — с debounce)
    const { searchQuery, statusFilter, sortOption } = useOrderFilters("user-reservations");
    const debouncedSearch = useDebounce(searchQuery, 350);
    const apiParams = useMemo(() => ({
        search: debouncedSearch || undefined,
        status: (statusFilter === 'all' || statusFilter === 'hide-completed') ? undefined : (statusFilter || undefined),
        sort: sortOption
    }), [debouncedSearch, statusFilter, sortOption]);

    // 2. Хук теперь сам вызывает useReservations для получения данных
    const { reservationsQuery } = useReservations(apiParams);
    const {
        data: reservationsData = [],
        isLoading: isLoadingReservations,
        isError: isReservationsError,
        hasNextPage,
        fetchNextPage,
        isFetchingNextPage,
    } = reservationsQuery;

    // Остальная логика остается почти без изменений
    const { data: allEquipment = [], isLoading: isLoadingEquipment, isError: isEquipmentError } = useAllEquipment();
    const { deleteReservation, updateReservation } = useReservations();

    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [itemToRemove, setItemToRemove] = useState<{ reservationId: number; equipmentId: number } | null>(null);
    const [reservationToCancel, setReservationToCancel] = useState<number | null>(null);

    const navigate = useNavigate();
    const reserveStoreClear = useReserveStore(state => state.clear);
    const reserveStoreBulkAdd = useReserveStore(state => state.bulkAdd);
    const dateStoreSetRange = useDateStore(state => state.setRange);

    const equipmentMap = useMemo(() => {
        const map: Record<number, Equipment> = {};
        allEquipment.forEach(e => { map[e.id] = e; });
        return map;
    }, [allEquipment]);

    const reservationsWithNames: ReservationWithNames[] = useMemo(() => {
        if (!reservationsData || !Array.isArray(reservationsData)) {
            return [];
        }
        
        let reservations = ReservationService.createReservationsWithNames(reservationsData, equipmentMap);
        
        // Применяем централизованный фильтр "скрыть завершенные" для резервов
        reservations = applyHideCompletedFilter(reservations, statusFilter, 'reservation');
        
        return reservations;
    }, [reservationsData, equipmentMap, statusFilter]);

    const cancelReservation = useCallback(async (id: number) => {
        setDeletingId(id);
        try {
            await deleteReservation.mutateAsync(id);
        } finally {
            setDeletingId(null);
        }
    }, [deleteReservation]);

    // Полная отмена резерва — только через явное подтверждение в диалоге
    // (Booking-паттерн: разрушительное действие с деталями, а не мгновенный DELETE)
    const requestCancelReservation = useCallback((id: number) => {
        setReservationToCancel(id);
    }, []);

    const handleConfirmCancellation = useCallback(async () => {
        if (reservationToCancel == null || deletingId !== null) return;
        await cancelReservation(reservationToCancel);
        setReservationToCancel(null);
    }, [reservationToCancel, cancelReservation, deletingId]);

    const handleCancelCancellation = useCallback(() => {
        setReservationToCancel(null);
    }, []);

    const removeItemFromReservation = useCallback(async (reservationId: number, equipmentId: number) => {
        setItemToRemove({ reservationId, equipmentId });
    }, []);

    const repeatReservation = useCallback((reservation: ReservationWithNames) => {
        reserveStoreClear();
        const startDate = new Date(reservation.start_date);
        const endDate = new Date(reservation.end_date);
        dateStoreSetRange(startDate, endDate);
        const equipmentToAdd = reservation.equipment_ids.map(id => equipmentMap[id]).filter(Boolean);
        reserveStoreBulkAdd(equipmentToAdd);
        navigate('/');
    }, [reserveStoreClear, dateStoreSetRange, reserveStoreBulkAdd, equipmentMap, navigate]);

    const handleConfirmRemoval = useCallback(async () => {
        if (!itemToRemove || updateReservation.isPending) return;
        const { reservationId, equipmentId } = itemToRemove;

        const reservationToUpdate = reservationsData.find(r => r.id === reservationId);
        if (!reservationToUpdate) return;

        const updatedEquipmentIds = reservationToUpdate.equipment_ids.filter(id => id !== equipmentId);

        // Удаление последней позиции = полная отмена резерва: PUT с пустым
        // списком создавал бы «пустой» резерв без оборудования
        if (updatedEquipmentIds.length === 0) {
            setItemToRemove(null);
            await cancelReservation(reservationId);
            return;
        }

        // Аксессуары удалённой позиции убираем из selected_accessories: бэкенд
        // отклоняет аксессуары для оборудования, которого нет в резерве (400)
        const updatedAccessories = Object.fromEntries(
            Object.entries(reservationToUpdate.selected_accessories || {})
                .filter(([eqId]) => updatedEquipmentIds.includes(Number(eqId)))
        );

        try {
            await updateReservation.mutateAsync({
                ...reservationToUpdate, // Передаем все данные резерва
                equipment_ids: updatedEquipmentIds, // Но с новым списком оборудования
                selected_accessories: updatedAccessories // И без аксессуаров удалённой позиции
            });
        } finally {
            setItemToRemove(null);
        }
    }, [itemToRemove, updateReservation, reservationsData, cancelReservation]);
    
    const handleCancelRemoval = useCallback(() => {
        setItemToRemove(null);
    }, []);

    return {
        refetch: () => { void reservationsQuery.refetch(); },
        hasNextPage,
        fetchNextPage: () => { void fetchNextPage(); },
        isFetchingNextPage,
        reservationsWithNames,
        equipmentMap,
        isLoading: isLoadingReservations || isLoadingEquipment,
        isError: isReservationsError || isEquipmentError,
        deletingId,
        itemToRemove,
        reservationToCancel,
        cancelReservation,
        removeItemFromReservation,
        repeatReservation,
        handleConfirmRemoval,
        handleCancelRemoval,
        requestCancelReservation,
        handleConfirmCancellation,
        handleCancelCancellation,
        isConfirmingCancellation: deletingId !== null && deletingId === reservationToCancel,
        isRemovingItem: updateReservation.isPending,
    };
};