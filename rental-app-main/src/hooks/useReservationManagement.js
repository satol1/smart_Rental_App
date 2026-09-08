// src/hooks/useReservationManagement.ts
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useReserveStore } from '@/store/reserveStore';
export function useReservationManagement(_filteredItems, availabilityMap, _availableOnly) {
    const location = useLocation();
    const { items: selectedItems, addToReservationMode } = useReserveStore();
    const editingReservationEquipmentIds = useMemo(() => {
        if (location.state?.intent === "add_to_reservation" && location.state?.reservationId) {
            return new Set(location.state?.equipmentIds || []);
        }
        return new Set();
    }, [location.state]);
    useEffect(() => {
        const intent = location.state?.intent;
        const reservationIdFromLocation = location.state?.reservationId;
        const storeActions = useReserveStore.getState();
        if (intent === "add_to_reservation" && reservationIdFromLocation) {
            if (storeActions.addToReservationMode !== reservationIdFromLocation) {
                storeActions.clear();
                storeActions.setAddToReservationMode(reservationIdFromLocation);
            }
        }
        else if (intent === "add_to_new_reservation") {
            if (storeActions.addToReservationMode !== null) {
                storeActions.clear();
            }
        }
        else {
            if (storeActions.addToReservationMode !== null) {
                storeActions.clear();
            }
        }
    }, [location.state]);
    // availabilityMap теперь передается как параметр, не нужно создавать его здесь
    const getEquipmentStatus = (eq) => {
        if (location.state?.intent === "add_to_reservation" && location.state?.reservationId === addToReservationMode) {
            if (editingReservationEquipmentIds.has(eq.id)) {
                return "my_reservation";
            }
            if (selectedItems.some(i => i.id === eq.id)) {
                return "added";
            }
        }
        const itemAvailability = availabilityMap[eq.id];
        // --- НАЧАЛО ИЗМЕНЕНИЙ (ВОЗВРАЩАЕМ КАК БЫЛО) ---
        // Теперь бэкенд сам отдает правильный статус, нам не нужна дополнительная логика
        return itemAvailability?.status ?? "available";
        // --- КОНЕЦ ИЗМЕНЕНИЙ ---
    };
    return {
        editingReservationId: location.state?.reservationId ?? null,
        intent: location.state?.intent ?? null,
        getEquipmentStatus
    };
}
