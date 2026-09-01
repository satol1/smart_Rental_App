// src/components/admin/AdminRentalCard.tsx

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
// ✅ ИСПРАВЛЕНИЕ 1: Убираем неиспользуемые иконки Wallet, Landmark, Paperclip
import { Calendar, Package, User, Truck, List, ChevronDown, Link as LinkIcon } from "lucide-react";
import { formatDateEuropean, cn } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
import type { AdminRentalOut } from "@/types/rental";
import { formatBalance, getBalanceColor } from "@/lib/balanceUtils";
import { useCurrentUser } from "@/hooks/useProfile";
import { useDeleteAdminRental, useRevertRentalToReservation } from "@/hooks/useAdminRentals";
import { useRentalToReservationNavigation } from "@/hooks/useRentalToReservationNavigation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Equipment } from "@/types/equipment";
import EditableRentalCard from "./EditableRentalCard";
import EquipmentWithAccessoriesList from "@/components/shared/EquipmentWithAccessoriesList";
import AdminRentalFinancialBlock from "./AdminRentalFinancialBlock";
import AdminRentalActionsBlock from "./AdminRentalActionsBlock";
import { STATUS_CONFIG } from "@/constants/statusConstants";

interface Props {
    rental: AdminRentalOut;
    onReturn: (rental: AdminRentalOut) => void;
    highlightId?: number;
    elementRef?: React.RefObject<HTMLDivElement>;
    getHighlightClasses?: (id: number) => string;
}

const isToday = (dateString: string): boolean => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
};

const AdminRentalCardComponent = ({ rental, onReturn, highlightId, elementRef, getHighlightClasses }: Props) => {
    const { data: currentUser } = useCurrentUser();
    const deleteMutation = useDeleteAdminRental();
    const revertMutation = useRevertRentalToReservation();
    const [isConfirmingRevert, setConfirmingRevert] = useState(false);
    const [isConfirmingPrepaymentRevert, setConfirmingPrepaymentRevert] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const cardRef = useRef<HTMLDivElement>(null);
    const { navigateToReservation } = useRentalToReservationNavigation({ context: 'admin' });

    const isHighlighted = highlightId === rental.id;

    const isAdmin = currentUser?.role === 'admin';
    const canRevert = !!rental.reservation_id && rental.status !== 'completed' && isToday(rental.created_at);

    const handleDelete = useCallback(() => {
        if (window.confirm(`Вы уверены, что хотите безвозвратно удалить аренду #${rental.id}? Это действие нельзя отменить.`)) {
            deleteMutation.mutate(rental.id);
        }
    }, [rental.id, deleteMutation]);

    const handleRevert = useCallback(() => {
        // Если аванса нет, или он равен нулю, или отмена уже в процессе - вызываем мутацию напрямую
        if (!rental.prepayment_amount || rental.prepayment_amount <= 0 || revertMutation.isPending) {
            revertMutation.mutate({ rentalId: rental.id, refundPrepayment: false });
            return;
        }
        
        // Если аванс есть - открываем диалог
        setConfirmingPrepaymentRevert(true);
    }, [rental, revertMutation]);
    
    // Обработчик для кнопки "Вернуть аванс"
    const handleRevertAndRefund = useCallback(() => {
        revertMutation.mutate({ rentalId: rental.id, refundPrepayment: true });
        setConfirmingPrepaymentRevert(false);
    }, [rental.id, revertMutation]);

    // Обработчик для кнопки "Оставить на балансе"
    const handleRevertAndKeep = useCallback(() => {
        revertMutation.mutate({ rentalId: rental.id, refundPrepayment: false });
        setConfirmingPrepaymentRevert(false);
    }, [rental.id, revertMutation]);

    const handleNavigateToReservation = useCallback((reservationId: number) => {
        navigateToReservation(reservationId);
    }, [navigateToReservation]);

    // Используем переданный ref или локальный
    const finalRef = elementRef || cardRef;

    if (isEditing) {
        return <EditableRentalCard rental={rental} onCancel={() => setIsEditing(false)} />;
    }

    const statusClass = STATUS_CONFIG[rental.status]?.badgeClass || "bg-white hover:shadow-md";
    
    // Используем переданную функцию для получения классов подсветки или локальную логику
    const highlightClass = getHighlightClasses ? getHighlightClasses(rental.id) : 
        (isHighlighted ? "ring-2 ring-offset-2 ring-amber-500 border-amber-400 bg-amber-50" : "");

    return (
        <>
            <div ref={finalRef} className={`relative w-full rounded-lg border transition-all hover:shadow-md ${highlightClass}`}>
                <Card className={cn("w-full", statusClass)}>
                    <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            {/* Блок с основной информацией */}
                            <div className="flex-1 space-y-2.5">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-lg text-orange-700 flex items-center gap-2">
                                        <Truck className="w-5 h-5"/> Аренда #{rental.id}
                                    </h3>
                                    <StatusBadge status={rental.status} />
                                </div>
                                <div className="text-sm text-gray-700 space-y-1.5 pl-1">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span>{rental.user.full_name} ({rental.user.email})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600">Баланс:</span>
                                        <span className={`font-medium ${getBalanceColor(rental.user.balance)}`}>
                                            {formatBalance(rental.user.balance)}
                                        </span>
                                    </div>
                                    {rental.reservation_id && (
                                        <div className="flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4 text-gray-500" />
                                            <button
                                                onClick={() => handleNavigateToReservation(rental.reservation_id!)}
                                                className="text-sky-600 hover:underline hover:text-sky-700 transition-colors"
                                            >
                                                Из резерва #{rental.reservation_id}
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span>{formatDateEuropean(rental.start_date)} — {formatDateEuropean(rental.end_date)}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Package className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <button
                                                onClick={() => setIsExpanded(!isExpanded)}
                                                className="flex items-center text-left w-full hover:text-sky-700 transition-colors disabled:hover:text-current disabled:cursor-not-allowed"
                                            >
                                                <span>Позиций в аренде: {rental.equipment.length + (rental.accessory_links?.length ?? 0)}</span>
                                                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Финансовый блок */}
                            <AdminRentalFinancialBlock rental={rental} />

                            {/* Блок с кнопками действий */}
                            <AdminRentalActionsBlock
                                rental={rental}
                                isAdmin={isAdmin}
                                canRevert={canRevert}
                                isDeleting={!!deleteMutation.isPending}
                                onEdit={() => setIsEditing(true)}
                                onReturn={() => onReturn(rental)}
                                onDelete={handleDelete}
                                onRevert={() => setConfirmingRevert(true)}
                            />
                        </div>

                        {/* Разворачиваемый блок с составом аренды */}
                        {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-dashed animate-in fade-in-0 slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
                                    <List className="w-4 h-4" />
                                    <span>Состав аренды:</span>
                                </div>
                                <EquipmentWithAccessoriesList
                                    equipment={rental.equipment}
                                    accessoryLinks={rental.accessory_links || []}
                                    title=""
                                    showTitle={false}
                                    className="border-t-0 pt-0"
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ConfirmationDialog
                open={isConfirmingRevert}
                onOpenChange={setConfirmingRevert}
                title="Отменить выдачу аренды?"
                description={`Аренда #${rental.id} будет удалена, а исходный резерв #${rental.reservation_id} снова станет активным. Это действие нельзя будет отменить.`}
                confirmText="Да, отменить выдачу"
                cancelText="Назад"
                onConfirm={handleRevert}
                variant="destructive"
            />

            {/* Новый диалог для подтверждения действия с авансом */}
            <ConfirmationDialog
                open={isConfirmingPrepaymentRevert}
                onOpenChange={setConfirmingPrepaymentRevert}
                title="Обработка аванса"
                description={`При выдаче этой аренды был внесен аванс в размере ${rental.prepayment_amount.toLocaleString('ru-RU')} ₽. Что сделать с этой суммой?`}
                onConfirm={() => {}} // Оставляем пустым
            >
                {/* Кастомизируем футер диалога */}
                <DialogFooter>
                    <Button variant="outline" onClick={handleRevertAndKeep}>
                        Оставить на балансе
                    </Button>
                    <Button variant="destructive" onClick={handleRevertAndRefund}>
                        Списать (вернуть)
                    </Button>
                </DialogFooter>
            </ConfirmationDialog>
        </>
    );
};

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AdminRentalCardComponent);