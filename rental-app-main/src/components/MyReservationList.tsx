// rental-app-main/src/components/MyReservationList.tsx

import React from "react";
import SharedErrorState from "@/components/shared/ErrorState";
import { motion } from "framer-motion";
import ReservationCard from "./ReservationCard";
import { FileText } from "lucide-react";
import ConfirmItemRemovalDialog from "./ConfirmItemRemovalDialog";
import { useReservationListViewModel } from "@/hooks/features/useReservationListViewModel";
import type { RefObject } from "react";
import EmptyStateWithActions from "./shared/EmptyStateWithActions";
import { useEmptyStateActions } from "./shared/useEmptyStateActions";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { listItem, staggerContainer } from "@/lib/motion";
import { formatDateEuropean } from "@/lib/utils";

interface MyReservationListProps {
    continueEditingReservationId?: number;
    getHighlightClasses?: (id: number) => string;
    elementRef?: RefObject<HTMLDivElement | null>;
}

// Список резервов рендерится в одну колонку — скелетон должен совпадать
const LoadingState = () => (
    <SkeletonList count={3} columns="single" />
);


const MyReservationListComponent = (props: MyReservationListProps) => {
    const {
        continueEditingReservationId,
        elementRef,
    } = props;

    // Используем ViewModel для получения ВСЕЙ логики и ДАННЫХ
    const {
        reservationsWithNames,
        equipmentMap,
        isLoading,
        isError,
        refetch,
        deletingId,
        itemToRemove,
        reservationToCancel,
        removeItemFromReservation,
        repeatReservation,
        handleConfirmRemoval,
        handleCancelRemoval,
        requestCancelReservation,
        handleConfirmCancellation,
        handleCancelCancellation,
        isConfirmingCancellation,
        isRemovingItem,
    } = useReservationListViewModel();

    // Хук для действий в пустом состоянии
    const { goToEquipmentSelection, goToHowItWorks } = useEmptyStateActions();

    if (isLoading) return <LoadingState />;
    if (isError) return <SharedErrorState message="Ошибка загрузки данных" onRetry={refetch} compact />;

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

    // Детали резерва в диалоге подтверждения полной отмены
    const reservationToCancelData = reservationsWithNames.find(r => r.id === reservationToCancel);
    const cancellationDescription = reservationToCancelData
        ? `Резерв #${reservationToCancelData.id}: ${reservationToCancelData.equipment_names.join(", ")}, ` +
          `${formatDateEuropean(new Date(reservationToCancelData.start_date))} — ${formatDateEuropean(new Date(reservationToCancelData.end_date))}. ` +
          "Резерв будет отменён полностью, оборудование станет доступно другим клиентам."
        : undefined;

    return (
        <div ref={elementRef} className="space-y-4">
            {/* Каскадное появление карточек резервов (stagger, только transform/opacity) */}
            <motion.div
                className="space-y-4"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
            >
                {reservationsWithNames.map((reservation) => (
                    <motion.div key={reservation.id} variants={listItem} layout>
                        <ReservationCard
                            id={reservation.id}
                            equipment={reservation.equipment_names.map((name, index) => ({ id: reservation.equipment_ids[index], label: name }))}
                            start_date={reservation.start_date}
                            end_date={reservation.end_date}
                            status={reservation.status}
                            onRemoveItem={(equipmentId) => removeItemFromReservation(reservation.id, equipmentId)}
                            onCancel={() => requestCancelReservation(reservation.id)}
                            cancelDisabled={deletingId === reservation.id}
                            onRepeat={() => repeatReservation(reservation)}
                            autoStartEdit={continueEditingReservationId === reservation.id}
                            total_cost={reservation.total_cost}
                            discount_amount={reservation.discount_amount}
                            promo_code={reservation.promo_code}
                            selected_accessories={reservation.selected_accessories}
                            accessory_links={reservation.accessory_links}
                            rental_id={reservation.rental_id}
                            created_at={reservation.created_at}
                            fullEquipmentData={reservation.equipment_ids.map(id => equipmentMap[id]).filter(Boolean)}
                        />
                    </motion.div>
                ))}
            </motion.div>

            <ConfirmItemRemovalDialog
                open={!!itemToRemove}
                onConfirm={handleConfirmRemoval}
                onClose={handleCancelRemoval}
                isConfirming={isRemovingItem}
                variant={itemToRemove && reservationsWithNames.find(r => r.id === itemToRemove.reservationId)?.equipment_ids.length === 1 ? 'cancelReservation' : 'removeItem'}
            />

            {/* Подтверждение полной отмены резерва (вместо мгновенного удаления в один клик) */}
            <ConfirmItemRemovalDialog
                open={reservationToCancel !== null}
                onConfirm={handleConfirmCancellation}
                onClose={handleCancelCancellation}
                isConfirming={isConfirmingCancellation}
                variant="fullCancel"
                description={cancellationDescription}
            />
        </div>
    );
};

export const MyReservationList = React.memo(MyReservationListComponent);
export default MyReservationList;
