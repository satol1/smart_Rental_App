// src/components/admin/AdminReservationCard.tsx

import React, { useState, useMemo, useEffect, forwardRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Package, Trash2, User, Truck, List } from "lucide-react";
import { formatDateEuropean, cn } from "@/lib/utils";
import type { AdminReservationOut } from "@/types/reservation";
import { useDeleteAdminReservation } from "@/hooks/useAdminReservations";
import { ReservationEditProvider } from "@/contexts/ReservationEditProvider";
import EditableReservationCard from "@/components/reservation/EditableReservationCard";
import type { Equipment } from "@/types/equipment";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminReservationSelectionStore } from "@/store/adminReservationSelectionStore";
import EquipmentWithAccessoriesList from "@/components/shared/EquipmentWithAccessoriesList";
import FinancialInfoBlock from "@/components/shared/FinancialInfoBlock";
import StatusBadge from "@/components/shared/StatusBadge";
import { useNavigate, useLocation } from "react-router-dom";

interface Props {
    reservation: AdminReservationOut;
    onConvertToRental: (reservation: AdminReservationOut) => void;
    equipmentMap: Map<number, Equipment>;
    highlightClasses?: string;
}


const AdminReservationCard = forwardRef<HTMLDivElement, Props>(({
    reservation,
    onConvertToRental,
    equipmentMap,
    highlightClasses = ''
}, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const deleteReservationMutation = useDeleteAdminReservation();

    const selectedIds = useAdminReservationSelectionStore(state => state.selectedIds);
    const toggleId = useAdminReservationSelectionStore(state => state.toggleId);
    const isSelected = selectedIds.includes(reservation.id);

    // Автоматическая прокрутка теперь обрабатывается в useHighlightLogic

    // Если вернулись с главной страницы для добавления оборудования,
    // автоматически открыть карточку нужного резерва в режиме редактирования
    useEffect(() => {
        const state = location.state as { continueEditing?: number } | null;
        if (state?.continueEditing === reservation.id) {
            setIsEditing(true);
            // Очистим state, чтобы не триггерилось повторно при навигации
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, reservation.id, navigate, location.pathname]);


    const handleDelete = useCallback(() => {
        if (window.confirm(`Вы уверены, что хотите удалить резерв #${reservation.id} для клиента "${reservation.user_info.full_name}"?`)) {
            deleteReservationMutation.mutate(reservation.id);
        }
    }, [reservation.id, reservation.user_info.full_name, deleteReservationMutation]);

    const handleNavigateToRental = useCallback(() => {
        if (reservation.rental_id) {
            navigate('/admin/rentals', {
                state: {
                    highlightId: reservation.rental_id,
                    statusFilterOverride: 'all'
                }
            });
        }
    }, [reservation.rental_id, navigate]);

    const initialEquipmentForDisplay = useMemo(() =>
            reservation.equipment_ids
                .map(id => {
                    const equipment = equipmentMap.get(id);
                    if (!equipment) {
                        return { id, label: `Оборудование #${id} (не найдено)` };
                    }
                    return { id, label: `${equipment.equipment_type} ${equipment.brand} ${equipment.name}` };
                }),
        [reservation.equipment_ids, equipmentMap]
    );

    const equipmentListForDisplay = useMemo(() =>
        reservation.equipment_ids.map(id => {
            const equipment = equipmentMap.get(id);
            return equipment
                ? `${equipment.equipment_type} ${equipment.brand} ${equipment.name}`
                : `Оборудование #${id} (не найдено)`;
        }), [reservation.equipment_ids, equipmentMap]);

    // Условный возврат после всех хуков
    if (isEditing) {
        return (
            <ReservationEditProvider
                reservation={reservation}
                initialEquipmentForDisplay={initialEquipmentForDisplay}
                onFullCancellation={handleDelete}
                isAdminContext={true}
                onFinishEditing={() => setIsEditing(false)}
            >
                <EditableReservationCard />
            </ReservationEditProvider>
        );
    }



    const highlightClass = isSelected
        ? 'ring-2 ring-primary/25 border-primary/30'
        : 'border-border';

    return (
        <div ref={ref} className={`relative w-full rounded-2xl border border-border bg-card transition-colors  ${highlightClass} ${highlightClasses}`}>
            <div className="absolute top-4 left-4 z-10">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleId(reservation.id)}
                    aria-label={`Выбрать резерв #${reservation.id}`}
                    className="bg-card h-5 w-5"
                />
            </div>
            <Card className={cn("w-full border-0 shadow-none bg-card")}>
                <CardContent className="p-5 pl-12 sm:pl-14">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_200px_auto]">
                        <div className="min-w-0 space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <h3
                                    className={`font-bold text-lg text-primary ${reservation.status === 'active' || reservation.status === 'overdue' ? 'cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:text-primary hover:underline transition-colors' : ''}`}
                                    role={reservation.status === 'active' || reservation.status === 'overdue' ? "button" : undefined}
                                    tabIndex={reservation.status === 'active' || reservation.status === 'overdue' ? 0 : undefined}
                                    onKeyDown={(event) => { if ((reservation.status === 'active' || reservation.status === 'overdue') && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setIsEditing(true); } }}
                                    onClick={reservation.status === 'active' || reservation.status === 'overdue' ? () => setIsEditing(true) : undefined}
                                >
                                    Резерв #{reservation.id}
                                </h3>
                                <StatusBadge status={reservation.status} />
                            </div>
                            <div className="text-sm text-foreground space-y-1.5 pl-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="min-w-0 break-words">{reservation.user_info.full_name} <span className="text-muted-foreground">({reservation.user_info.email})</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{formatDateEuropean(reservation.start_date)} — {formatDateEuropean(reservation.end_date)}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Package className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex items-center text-left w-full">
                                            <span>Позиций в резерве: {equipmentListForDisplay.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Финансовый блок */}
                        <FinancialInfoBlock
                            totalCost={reservation.total_cost}
                            discountAmount={reservation.discount_amount}
                            promoCode={reservation.promo_code}
                            variant="admin"
                        />

                        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 xl:flex-col xl:items-stretch xl:border-t-0 xl:border-l xl:pl-5 xl:pt-0">
                            {(reservation.status === 'active' || reservation.status === 'overdue') ? (
                                <>
                                    <Button onClick={() => onConvertToRental(reservation)} size="sm" className="w-full sm:w-auto">
                                        <Truck className="mr-2 h-4 w-4" />
                                        Выдать в аренду
                                    </Button>
                                    <Button onClick={() => setIsEditing(true)} size="sm" variant="outline" className="w-full sm:w-auto">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Редактировать
                                    </Button>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground flex items-center gap-2 pr-2">
                                    <span>Действий нет</span>
                                </div>
                            )}

                            {/* Кнопка перехода к аренде для выполненных резервов */}
                            {reservation.status === 'fulfilled' && reservation.rental_id && (
                                <Button onClick={handleNavigateToRental} size="sm" variant="outline" className="w-full sm:w-auto text-warning hover:text-warning hover:bg-warning-soft border-warning/20">
                                    <Truck className="mr-2 h-4 w-4" />
                                    Перейти к аренде
                                </Button>
                            )}

                            <Button onClick={handleDelete} size="sm" variant="destructive" disabled={deleteReservationMutation.isPending} className="w-full sm:w-auto">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleteReservationMutation.isPending ? "Удаление..." : "Удалить"}
                            </Button>
                        </div>
                    </div>

                    {equipmentListForDisplay.length > 0 && (
                        <div className="mt-3 pt-3 border-t ">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                                <List className="w-4 h-4" />
                                <span>Состав резерва:</span>
                            </div>
                            <EquipmentWithAccessoriesList
                                equipment={reservation.equipment_ids.map(equipmentId => {
                                    const equipment = equipmentMap.get(equipmentId);
                                    if (!equipment) {
                                        // Создаем минимальный объект Equipment для не найденного оборудования
                                        return {
                                            id: equipmentId,
                                            name: `Оборудование #${equipmentId} (не найдено)`,
                                            brand: '',
                                            equipment_type: '',
                                            condition: '',
                                            daily_rate: 0,
                                            image_url: '',
                                            short_description: '',
                                            accessories: []
                                        } as Equipment;
                                    }
                                    return equipment;
                                })}
                                accessoryLinks={reservation.accessory_links || []}
                                title=""
                                showTitle={false}
                                className="border-t-0 pt-0"
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
});

AdminReservationCard.displayName = 'AdminReservationCard';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AdminReservationCard);
