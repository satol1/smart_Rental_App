// path: src/hooks/useReservationNavigation.ts

import { useLocation, useNavigate } from "react-router-dom";
import { useReserveStore } from "@/store/reserveStore";
import type { Reservation } from "@/types/reservation";

/** Возможные поля location.state, используемые навигацией по резервам */
interface LocationState {
    from?: string;
    reservationId?: number;
    equipmentIds?: number[];
    startDate?: string;
    endDate?: string;
    intent?: string;
}

/**
 * Хук для централизованного управления навигацией
 * при добавлении оборудования в существующий резерв.
 */
export function useReservationNavigation() {
    const navigate = useNavigate();
    const location = useLocation();
    const { clear: clearReserveStore, addToReservationMode } = useReserveStore.getState();

    /**
     * Переходит на главную страницу для выбора оборудования,
     * сохраняя контекст текущего резерва и путь для возврата.
     */
    const goToEquipmentSelection = (
        reservation: Reservation,
        isAdminContext: boolean
    ) => {
        const returnPath = isAdminContext ? "/admin/reservations" : location.pathname;

        navigate("/", {
            state: {
                intent: "add_to_reservation",
                reservationId: reservation.id,
                equipmentIds: reservation.equipment_ids,
                startDate: reservation.start_date,
                endDate: reservation.end_date,
                from: returnPath,
            },
        });
    };

    /**
     * Завершает добавление оборудования и возвращает пользователя
     * на исходную страницу (админскую или пользовательскую).
     */
    const returnFromEquipmentSelection = () => {
        const reservationId = addToReservationMode;
        if (!reservationId) {
            // Этот случай для создания нового резерва, а не редактирования
            navigate("/reserve/create");
            return;
        }

        const returnPath = (location.state as LocationState | null)?.from || (reservationId ? "/reservations/my" : "/");
        const isReturningToAdmin = returnPath.startsWith('/admin');
        
        const returnState = isReturningToAdmin
            ? { continueEditing: reservationId }
            : { continueEditing: reservationId };

        navigate(returnPath, {
            replace: true,
            state: returnState,
        });
    };

    /**
     * Отменяет добавление оборудования и возвращает пользователя.
     */
    const cancelAndReturn = () => {
        clearReserveStore();
        const state = location.state as LocationState | null;
        const returnPath = state?.from || "/reservations/my";
        const reservationId = state?.reservationId;
        
        const isReturningToAdmin = returnPath.startsWith('/admin');
        const returnState = isReturningToAdmin
            ? { continueEditing: reservationId }
            : { continueEditing: reservationId };
            
        navigate(returnPath, {
            replace: true,
            state: returnState,
        });
    };

    return {
        goToEquipmentSelection,
        returnFromEquipmentSelection,
        cancelAndReturn,
    };
}
