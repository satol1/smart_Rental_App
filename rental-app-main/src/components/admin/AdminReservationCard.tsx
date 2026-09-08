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
import { STATUS_CONFIG } from "@/constants/statusConstants";

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

    const statusClass = STATUS_CONFIG[reservation.status]?.badgeClass || "bg-white hover:shadow-md";
    
    const highlightClass = isSelected
        ? 'ring-2 ring-sky-500 border-sky-400'
        : 'border-gray-200';

    return (
        <div ref={ref} className={`relative w-full rounded-lg border transition-all hover:shadow-md ${highlightClass} ${highlightClasses}`}>
            <div className="absolute top-4 left-4 z-10">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleId(reservation.id)}
                    aria-label={`Выбрать резерв #${reservation.id}`}
                    className="bg-white h-5 w-5"
                />
            </div>
            <Card className={cn("w-full", statusClass)}>
                <CardContent className="p-4 pl-12">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex-1 space-y-2.5">
                            <div className="flex items-center gap-4">
                                <h3 
                                    className={`font-bold text-lg text-indigo-700 ${reservation.status === 'active' || reservation.status === 'overdue' ? 'cursor-pointer hover:text-indigo-800 hover:underline transition-colors' : ''}`}
                                    onClick={reservation.status === 'active' || reservation.status === 'overdue' ? () => setIsEditing(true) : undefined}
                                >
                                    Резерв #{reservation.id}
                                </h3>
                                <StatusBadge status={reservation.status} />
                            </div>
                            <div className="text-sm text-gray-700 space-y-1.5 pl-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span>{reservation.user_info.full_name} ({reservation.user_info.email})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span>{formatDateEuropean(reservation.start_date)} — {formatDateEuropean(reservation.end_date)}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Package className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
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

                        <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4">
                            {(reservation.status === 'active' || reservation.status === 'overdue') ? (
                                <>
                                    <Button onClick={() => onConvertToRental(reservation)} size="sm" className="bg-green-600 hover:bg-green-700 w-full md:w-auto">
                                        <Truck className="mr-2 h-4 w-4" />
                                        Выдать в аренду
                                    </Button>
                                    <Button onClick={() => setIsEditing(true)} size="sm" variant="outline" className="w-full md:w-auto">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Редактировать
                                    </Button>
                                </>
                            ) : (
                                <div className="text-sm text-gray-500 flex items-center gap-2 pr-2">
                                    <span>Действий нет</span>
                                </div>
                            )}

                            {/* Кнопка перехода к аренде для выполненных резервов */}
                            {reservation.status === 'fulfilled' && reservation.rental_id && (
                                <Button onClick={handleNavigateToRental} size="sm" variant="outline" className="w-full md:w-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200">
                                    <Truck className="mr-2 h-4 w-4" />
                                    Перейти к аренде
                                </Button>
                            )}

                            <Button onClick={handleDelete} size="sm" variant="destructive" disabled={deleteReservationMutation.isPending} className="w-full md:w-auto">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleteReservationMutation.isPending ? "Удаление..." : "Удалить"}
                            </Button>
                        </div>
                    </div>

                    {equipmentListForDisplay.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-dashed animate-in fade-in-0 slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
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