// src/components/admin/AdminRentalCard.tsx

import React, { useState, useRef, useCallback } from "react";
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

import EditableRentalCard from "./EditableRentalCard";
import EquipmentWithAccessoriesList from "@/components/shared/EquipmentWithAccessoriesList";
import AdminRentalFinancialBlock from "./AdminRentalFinancialBlock";
import AdminRentalActionsBlock from "./AdminRentalActionsBlock";

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
    const cardRef = useRef<HTMLDivElement>(null);
    const { navigateToReservation } = useRentalToReservationNavigation({ context: 'admin' });

    const isHighlighted = highlightId === rental.id;

    const isAdmin = currentUser?.role === 'admin';
    const canRevert = !!rental.reservation_id && rental.status !== 'completed' && isToday(rental.created_at);

    const [isConfirmingDelete, setConfirmingDelete] = useState(false);
    const handleDelete = useCallback(() => {
        setConfirmingDelete(true);
    }, []);

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



    // Используем переданную функцию для получения классов подсветки или локальную логику
    const highlightClass = getHighlightClasses ? getHighlightClasses(rental.id) :
        (isHighlighted ? "ring-2 ring-offset-2 ring-ring border-warning/20 bg-warning-soft" : "");

    return (
        <>
            <div ref={finalRef} className={`relative w-full rounded-2xl border border-border bg-card transition-colors  ${highlightClass}`}>
                <Card className={cn("w-full border-0 shadow-none bg-card")}>
                    <CardContent className="p-5">
                        <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
                            {/* Блок с основной информацией */}
                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                        <Truck className="w-5 h-5"/> Аренда #{rental.id}
                                    </h3>
                                    <StatusBadge status={rental.status} />
                                </div>
                                <div className="text-sm text-foreground space-y-1.5 pl-1">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="min-w-0 break-words">{rental.user.full_name} <span className="text-muted-foreground">({rental.user.email})</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Баланс:</span>
                                        <span className={`font-medium ${getBalanceColor(rental.user.balance)}`}>
                                            {formatBalance(rental.user.balance)}
                                        </span>
                                    </div>
                                    {rental.reservation_id && (
                                        <div className="flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4 text-muted-foreground" />
                                            <button
                                                onClick={() => handleNavigateToReservation(rental.reservation_id!)}
                                                className="text-primary hover:underline hover:text-primary transition-colors"
                                            >
                                                Из резерва #{rental.reservation_id}
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span>{formatDateEuropean(rental.start_date)} — {formatDateEuropean(rental.end_date)}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Package className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <button
                                                aria-expanded={isExpanded}
                                                onClick={() => setIsExpanded(!isExpanded)}
                                                className="flex items-center text-left w-full hover:text-primary transition-colors disabled:hover:text-current disabled:cursor-not-allowed"
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
                            <div className="mt-3 pt-3 border-t ">
                                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
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

            <ConfirmationDialog
                open={isConfirmingDelete}
                onOpenChange={setConfirmingDelete}
                title="Удалить аренду?"
                description={`Аренда #${rental.id} будет удалена безвозвратно. Это действие нельзя отменить.`}
                confirmText="Удалить"
                variant="destructive"
                onConfirm={() => deleteMutation.mutate(rental.id)}
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
