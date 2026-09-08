import { jsx as _jsx } from "react/jsx-runtime";
// src/components/admin/AllReservationsList.tsx
import React from "react";
import AdminReservationCard from "./AdminReservationCard";
const AllReservationsListComponent = ({ reservations, onConvertToRental, equipmentMap, getHighlightClasses, elementRef, highlightId }) => {
    return (_jsx("div", { className: "space-y-4", children: reservations.map((reservation) => (_jsx(AdminReservationCard, { reservation: reservation, onConvertToRental: onConvertToRental, equipmentMap: equipmentMap, 
            // Привязываем ref только к целевому элементу
            ref: highlightId === reservation.id ? elementRef : null, 
            // Передаем классы подсветки
            highlightClasses: getHighlightClasses(reservation.id) }, reservation.id))) }));
};
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AllReservationsListComponent);
