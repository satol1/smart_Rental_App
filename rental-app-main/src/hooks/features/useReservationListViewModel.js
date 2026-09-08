// rental-app-main/src/hooks/features/useReservationListViewModel.ts
import { useMemo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReservations } from "@/hooks/useReservations";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useReserveStore } from "@/store/reserveStore";
import { useDateStore } from "@/store/dateStore";
import { ReservationService } from "@/core/services";
import { useOrderFilterStore } from "@/store/orderFilterStore";
import { applyHideCompletedFilter } from "@/lib/filterUtils";
/**
 * ViewModel-хук для управления списком резервов.
 * Инкапсулирует ВСЮ логику: получение данных, фильтрацию, обработку действий.
 */
export const useReservationListViewModel = () => {
    // 1. Получаем параметры фильтрации из zustand store
    const { searchQuery, statusFilter, sortOption } = useOrderFilterStore();
    const apiParams = useMemo(() => ({
        search: searchQuery || undefined,
        status: (statusFilter === 'all' || statusFilter === 'hide-completed') ? undefined : (statusFilter || undefined),
        sort: sortOption
    }), [searchQuery, statusFilter, sortOption]);
    // 2. Хук теперь сам вызывает useReservations для получения данных
    const { reservationsQuery } = useReservations(apiParams);
    const { data: reservationsData = [], isLoading: isLoadingReservations, isError: isReservationsError } = reservationsQuery;
    // Остальная логика остается почти без изменений
    const { data: allEquipment = [], isLoading: isLoadingEquipment, isError: isEquipmentError } = useAllEquipment();
    const { deleteReservation, updateReservation } = useReservations();
    const [deletingId, setDeletingId] = useState(null);
    const [itemToRemove, setItemToRemove] = useState(null);
    const [reservationToCancel, setReservationToCancel] = useState(null);
    const navigate = useNavigate();
    const reserveStoreClear = useReserveStore(state => state.clear);
    const reserveStoreBulkAdd = useReserveStore(state => state.bulkAdd);
    const dateStoreSetRange = useDateStore(state => state.setRange);
    const equipmentMap = useMemo(() => {
        const map = {};
        allEquipment.forEach(e => { map[e.id] = e; });
        return map;
    }, [allEquipment]);
    const reservationsWithNames = useMemo(() => {
        if (!reservationsData || !Array.isArray(reservationsData)) {
            return [];
        }
        let reservations = ReservationService.createReservationsWithNames(reservationsData, equipmentMap);
        // Применяем централизованный фильтр "скрыть завершенные" для резервов
        reservations = applyHideCompletedFilter(reservations, statusFilter, 'reservation');
        return reservations;
    }, [reservationsData, equipmentMap, statusFilter]);
    const cancelReservation = useCallback(async (id) => {
        setDeletingId(id);
        try {
            await deleteReservation.mutateAsync(id);
        }
        finally {
            setDeletingId(null);
        }
    }, [deleteReservation]);
    // Полная отмена резерва — только через явное подтверждение в диалоге
    // (Booking-паттерн: разрушительное действие с деталями, а не мгновенный DELETE)
    const requestCancelReservation = useCallback((id) => {
        setReservationToCancel(id);
    }, []);
    const handleConfirmCancellation = useCallback(async () => {
        if (reservationToCancel == null)
            return;
        await cancelReservation(reservationToCancel);
        setReservationToCancel(null);
    }, [reservationToCancel, cancelReservation]);
    const handleCancelCancellation = useCallback(() => {
        setReservationToCancel(null);
    }, []);
    const removeItemFromReservation = useCallback(async (reservationId, equipmentId) => {
        setItemToRemove({ reservationId, equipmentId });
    }, []);
    const repeatReservation = useCallback((reservation) => {
        reserveStoreClear();
        const startDate = new Date(reservation.start_date);
        const endDate = new Date(reservation.end_date);
        dateStoreSetRange(startDate, endDate);
        const equipmentToAdd = reservation.equipment_ids.map(id => equipmentMap[id]).filter(Boolean);
        reserveStoreBulkAdd(equipmentToAdd);
        navigate('/');
    }, [reserveStoreClear, dateStoreSetRange, reserveStoreBulkAdd, equipmentMap, navigate]);
    const handleConfirmRemoval = useCallback(async () => {
        if (!itemToRemove)
            return;
        const { reservationId, equipmentId } = itemToRemove;
        const reservationToUpdate = reservationsData.find(r => r.id === reservationId);
        if (!reservationToUpdate)
            return;
        const updatedEquipmentIds = reservationToUpdate.equipment_ids.filter(id => id !== equipmentId);
        // Аксессуары удалённой позиции убираем из selected_accessories: бэкенд
        // отклоняет аксессуары для оборудования, которого нет в резерве (400)
        const updatedAccessories = Object.fromEntries(Object.entries(reservationToUpdate.selected_accessories || {})
            .filter(([eqId]) => updatedEquipmentIds.includes(Number(eqId))));
        try {
            await updateReservation.mutateAsync({
                ...reservationToUpdate, // Передаем все данные резерва
                equipment_ids: updatedEquipmentIds, // Но с новым списком оборудования
                selected_accessories: updatedAccessories // И без аксессуаров удалённой позиции
            });
        }
        finally {
            setItemToRemove(null);
        }
    }, [itemToRemove, updateReservation, reservationsData]);
    const handleCancelRemoval = useCallback(() => {
        setItemToRemove(null);
    }, []);
    return {
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
