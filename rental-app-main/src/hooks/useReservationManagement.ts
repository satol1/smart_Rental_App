// src/hooks/useReservationManagement.ts

import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useReserveStore } from '@/store/reserveStore';
import type { Equipment } from '@/types/equipment';
import type { AvailabilityInfo, EquipmentStatus } from '@/types/availability';

type UseReservationManagementReturn = {
    editingReservationId: number | null;
    intent: string | null;
    getEquipmentStatus: (eq: Equipment) => EquipmentStatus | "my_reservation" | "added";
};

export function useReservationManagement(
    _filteredItems: Equipment[],
    availabilityMap: Record<number, AvailabilityInfo>
): UseReservationManagementReturn {
    const location = useLocation();
    const { items: selectedItems, addToReservationMode } = useReserveStore();

    const editingReservationEquipmentIds = useMemo(() => {
        if (location.state?.intent === "add_to_reservation" && location.state?.reservationId) {
            return new Set(location.state?.equipmentIds || []);
        }
        return new Set<number>();
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
        } else if (intent === "add_to_new_reservation") {
            if (storeActions.addToReservationMode !== null) {
                storeActions.clear();
            }
        } else {
            if (storeActions.addToReservationMode !== null) {
                storeActions.clear();
            }
        }
    }, [location.state]);

    // availabilityMap теперь передается как параметр, не нужно создавать его здесь


    const getEquipmentStatus = (eq: Equipment): EquipmentStatus | "my_reservation" | "added" => {
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