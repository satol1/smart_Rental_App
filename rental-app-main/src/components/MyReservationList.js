import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// rental-app-main/src/components/MyReservationList.tsx
import React from "react";
import { motion } from "framer-motion";
import ReservationCard from "./ReservationCard";
import { FileText } from "lucide-react";
import ConfirmItemRemovalDialog from "./ConfirmItemRemovalDialog";
import { useReservationListViewModel } from "@/hooks/features/useReservationListViewModel";
import EmptyStateWithActions, { useEmptyStateActions } from "./shared/EmptyStateWithActions";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { listItem, staggerContainer } from "@/lib/motion";
import { formatDateEuropean } from "@/lib/utils";
// Список резервов рендерится в одну колонку — скелетон должен совпадать
const LoadingState = () => (_jsx(SkeletonList, { count: 3, columns: "single" }));
const ErrorState = ({ message }) => (_jsx("p", { className: "text-red-600 text-center py-4", children: message }));
const MyReservationListComponent = (props) => {
    const { continueEditingReservationId, getHighlightClasses: _getHighlightClasses, elementRef, } = props;
    // Используем ViewModel для получения ВСЕЙ логики и ДАННЫХ
    const { reservationsWithNames, equipmentMap, isLoading, isError, deletingId, itemToRemove, reservationToCancel, removeItemFromReservation, repeatReservation, handleConfirmRemoval, handleCancelRemoval, requestCancelReservation, handleConfirmCancellation, handleCancelCancellation, isConfirmingCancellation, isRemovingItem, } = useReservationListViewModel();
    // Хук для действий в пустом состоянии
    const { goToEquipmentSelection, goToHowItWorks } = useEmptyStateActions();
    if (isLoading)
        return _jsx(LoadingState, {});
    if (isError)
        return _jsx(ErrorState, { message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445" });
    if (reservationsWithNames.length === 0) {
        return (_jsx(EmptyStateWithActions, { icon: FileText, title: "\u041D\u0435\u0442 \u0440\u0435\u0437\u0435\u0440\u0432\u043E\u0432", description: "\u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0438\u043B\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044B\u0445 \u0440\u0435\u0437\u0435\u0440\u0432\u043E\u0432 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F.", primaryAction: {
                label: "Перейти к выбору оборудования",
                onClick: goToEquipmentSelection,
                variant: "default"
            }, secondaryAction: {
                label: "Как это работает",
                onClick: goToHowItWorks,
                variant: "outline"
            } }));
    }
    // Детали резерва в диалоге подтверждения полной отмены
    const reservationToCancelData = reservationsWithNames.find(r => r.id === reservationToCancel);
    const cancellationDescription = reservationToCancelData
        ? `Резерв #${reservationToCancelData.id}: ${reservationToCancelData.equipment_names.join(", ")}, ` +
            `${formatDateEuropean(new Date(reservationToCancelData.start_date))} — ${formatDateEuropean(new Date(reservationToCancelData.end_date))}. ` +
            "Резерв будет отменён полностью, оборудование станет доступно другим клиентам."
        : undefined;
    return (_jsxs("div", { ref: elementRef, className: "space-y-4", children: [_jsx(motion.div, { className: "space-y-4", variants: staggerContainer, initial: "hidden", animate: "visible", children: reservationsWithNames.map((reservation) => (_jsx(motion.div, { variants: listItem, layout: true, children: _jsx(ReservationCard, { id: reservation.id, equipment: reservation.equipment_names.map((name, index) => ({ id: reservation.equipment_ids[index], label: name })), start_date: reservation.start_date, end_date: reservation.end_date, status: reservation.status, onRemoveItem: (equipmentId) => removeItemFromReservation(reservation.id, equipmentId), onCancel: () => requestCancelReservation(reservation.id), cancelDisabled: deletingId === reservation.id, onRepeat: () => repeatReservation(reservation), autoStartEdit: continueEditingReservationId === reservation.id, total_cost: reservation.total_cost, discount_amount: reservation.discount_amount, promo_code: reservation.promo_code, selected_accessories: reservation.selected_accessories, accessory_links: reservation.accessory_links, rental_id: reservation.rental_id, created_at: reservation.created_at, fullEquipmentData: reservation.equipment_ids.map(id => equipmentMap[id]).filter(Boolean) }) }, reservation.id))) }), _jsx(ConfirmItemRemovalDialog, { open: !!itemToRemove, onConfirm: handleConfirmRemoval, onClose: handleCancelRemoval, isConfirming: isRemovingItem, variant: itemToRemove && reservationsWithNames.find(r => r.id === itemToRemove.reservationId)?.equipment_ids.length === 1 ? 'cancelReservation' : 'removeItem' }), _jsx(ConfirmItemRemovalDialog, { open: reservationToCancel !== null, onConfirm: handleConfirmCancellation, onClose: handleCancelCancellation, isConfirming: isConfirmingCancellation, variant: "fullCancel", description: cancellationDescription })] }));
};
export const MyReservationList = React.memo(MyReservationListComponent);
export default MyReservationList;
