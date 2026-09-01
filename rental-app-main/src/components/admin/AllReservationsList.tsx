// src/components/admin/AllReservationsList.tsx

import React from "react";
import type { AdminReservationOut } from "@/types/reservation";
import AdminReservationCard from "./AdminReservationCard";
import type { Equipment } from "@/types/equipment";
import { RefObject } from "react";

interface Props {
    reservations: AdminReservationOut[];
    onConvertToRental: (reservation: AdminReservationOut) => void;
    equipmentMap: Map<number, Equipment>;
    getHighlightClasses: (id: number) => string;
    elementRef: RefObject<HTMLDivElement | null>;
    highlightId?: number | null;
}

const AllReservationsListComponent = ({ 
    reservations, 
    onConvertToRental, 
    equipmentMap, 
    getHighlightClasses,
    elementRef,
    highlightId 
}: Props) => {
    return (
        <div className="space-y-4">
            {reservations.map((reservation) => (
                <AdminReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onConvertToRental={onConvertToRental}
                    equipmentMap={equipmentMap}
                    // Привязываем ref только к целевому элементу
                    ref={highlightId === reservation.id ? elementRef : null}
                    // Передаем классы подсветки
                    highlightClasses={getHighlightClasses(reservation.id)}
                />
            ))}
        </div>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AllReservationsListComponent);