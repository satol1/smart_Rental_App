// rental-app-main/src/components/MyReservationList.tsx

import React from "react";
import ReservationCard from "./ReservationCard";
import { FileText } from "lucide-react";
import ConfirmItemRemovalDialog from "./ConfirmItemRemovalDialog";
import { useReservationListViewModel } from "@/hooks/features/useReservationListViewModel";
import { RefObject } from "react";
import EmptyStateWithActions, { useEmptyStateActions } from "./shared/EmptyStateWithActions";

interface MyReservationListProps {
    continueEditingReservationId?: number;
    getHighlightClasses?: (id: number) => string;
    elementRef?: RefObject<HTMLDivElement | null>;
}

const LoadingState = () => (
    <p className="text-center py-4">Загрузка данных...</p>
);

const ErrorState = ({ message }: { message: string }) => (
    <p className="text-red-600 text-center py-4">{message}</p>
);

const MyReservationListComponent = (props: MyReservationListProps) => {
    const {
        continueEditingReservationId,
        getHighlightClasses,
        elementRef,
    } = props;

    // Используем ViewModel для получения ВСЕЙ логики и ДАННЫХ
    const {
        reservationsWithNames,
        equipmentMap,
        isLoading,
        isError,
        deletingId,
        itemToRemove,
        cancelReservation,
        removeItemFromReservation,
        repeatReservation,
        handleConfirmRemoval,
        handleCancelRemoval,
    } = useReservationListViewModel();

    // Хук для действий в пустом состоянии
    const { goToEquipmentSelection, goToHowItWorks } = useEmptyStateActions();

    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState message="Ошибка загрузки данных" />;

    if (reservationsWithNames.length === 0) {
        return (
            <EmptyStateWithActions
                icon={FileText}
                title="Нет резервов"
                description="У вас пока нет активных или завершенных резервов оборудования."
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
    }

    return (
        <div ref={elementRef} className="space-y-4">
            {reservationsWithNames.map((reservation) => (
                <ReservationCard
                    key={reservation.id}
                    id={reservation.id}
                    equipment={reservation.equipment_names.map((name, index) => ({ id: reservation.equipment_ids[index], label: name }))}
                    start_date={reservation.start_date}
                    end_date={reservation.end_date}
                    status={reservation.status}
                    onRemoveItem={(equipmentId) => removeItemFromReservation(reservation.id, equipmentId)}
                    onCancel={() => cancelReservation(reservation.id)}
                    cancelDisabled={deletingId === reservation.id}
                    onRepeat={() => repeatReservation(reservation)}
                    autoStartEdit={continueEditingReservationId === reservation.id}
                    total_cost={reservation.total_cost}
                    discount_amount={reservation.discount_amount}
                    promo_code={reservation.promo_code}
                    selected_accessories={reservation.selected_accessories}
                    accessory_links={reservation.accessory_links}
                    rental_id={reservation.rental_id}
                    fullEquipmentData={reservation.equipment_ids.map(id => equipmentMap[id]).filter(Boolean)}
                />
            ))}
            
            <ConfirmItemRemovalDialog
                open={!!itemToRemove}
                onConfirm={handleConfirmRemoval}
                onClose={handleCancelRemoval}
                isConfirming={false}
                variant={itemToRemove && reservationsWithNames.find(r => r.id === itemToRemove.reservationId)?.equipment_ids.length === 1 ? 'cancelReservation' : 'removeItem'}
            />
        </div>
    );
};

export const MyReservationList = React.memo(MyReservationListComponent);
export default MyReservationList;