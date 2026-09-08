import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/AdminRentalCard.tsx
import React, { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
// ✅ ИСПРАВЛЕНИЕ 1: Убираем неиспользуемые иконки Wallet, Landmark, Paperclip
import { Calendar, Package, User, Truck, List, ChevronDown, Link as LinkIcon } from "lucide-react";
import { formatDateEuropean, cn } from "@/lib/utils";
import StatusBadge from "@/components/shared/StatusBadge";
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
import { STATUS_CONFIG } from "@/constants/statusConstants";
const isToday = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
};
const AdminRentalCardComponent = ({ rental, onReturn, highlightId, elementRef, getHighlightClasses }) => {
    const { data: currentUser } = useCurrentUser();
    const deleteMutation = useDeleteAdminRental();
    const revertMutation = useRevertRentalToReservation();
    const [isConfirmingRevert, setConfirmingRevert] = useState(false);
    const [isConfirmingPrepaymentRevert, setConfirmingPrepaymentRevert] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const cardRef = useRef(null);
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
    const handleNavigateToReservation = useCallback((reservationId) => {
        navigateToReservation(reservationId);
    }, [navigateToReservation]);
    // Используем переданный ref или локальный
    const finalRef = elementRef || cardRef;
    if (isEditing) {
        return _jsx(EditableRentalCard, { rental: rental, onCancel: () => setIsEditing(false) });
    }
    const statusClass = STATUS_CONFIG[rental.status]?.badgeClass || "bg-white hover:shadow-md";
    // Используем переданную функцию для получения классов подсветки или локальную логику
    const highlightClass = getHighlightClasses ? getHighlightClasses(rental.id) :
        (isHighlighted ? "ring-2 ring-offset-2 ring-amber-500 border-amber-400 bg-amber-50" : "");
    return (_jsxs(_Fragment, { children: [_jsx("div", { ref: finalRef, className: `relative w-full rounded-lg border transition-all hover:shadow-md ${highlightClass}`, children: _jsx(Card, { className: cn("w-full", statusClass), children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "flex flex-col md:flex-row gap-4 justify-between", children: [_jsxs("div", { className: "flex-1 space-y-2.5", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("h3", { className: "font-bold text-lg text-orange-700 flex items-center gap-2", children: [_jsx(Truck, { className: "w-5 h-5" }), " \u0410\u0440\u0435\u043D\u0434\u0430 #", rental.id] }), _jsx(StatusBadge, { status: rental.status })] }), _jsxs("div", { className: "text-sm text-gray-700 space-y-1.5 pl-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(User, { className: "w-4 h-4 text-gray-500" }), _jsxs("span", { children: [rental.user.full_name, " (", rental.user.email, ")"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-gray-600", children: "\u0411\u0430\u043B\u0430\u043D\u0441:" }), _jsx("span", { className: `font-medium ${getBalanceColor(rental.user.balance)}`, children: formatBalance(rental.user.balance) })] }), rental.reservation_id && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(LinkIcon, { className: "w-4 h-4 text-gray-500" }), _jsxs("button", { onClick: () => handleNavigateToReservation(rental.reservation_id), className: "text-sky-600 hover:underline hover:text-sky-700 transition-colors", children: ["\u0418\u0437 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 #", rental.reservation_id] })] })), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "w-4 h-4 text-gray-500" }), _jsxs("span", { children: [formatDateEuropean(rental.start_date), " \u2014 ", formatDateEuropean(rental.end_date)] })] }), _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Package, { className: "w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" }), _jsx("div", { className: "flex-1", children: _jsxs("button", { onClick: () => setIsExpanded(!isExpanded), className: "flex items-center text-left w-full hover:text-sky-700 transition-colors disabled:hover:text-current disabled:cursor-not-allowed", children: [_jsxs("span", { children: ["\u041F\u043E\u0437\u0438\u0446\u0438\u0439 \u0432 \u0430\u0440\u0435\u043D\u0434\u0435: ", rental.equipment.length + (rental.accessory_links?.length ?? 0)] }), _jsx(ChevronDown, { className: `w-4 h-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}` })] }) })] })] })] }), _jsx(AdminRentalFinancialBlock, { rental: rental }), _jsx(AdminRentalActionsBlock, { rental: rental, isAdmin: isAdmin, canRevert: canRevert, isDeleting: !!deleteMutation.isPending, onEdit: () => setIsEditing(true), onReturn: () => onReturn(rental), onDelete: handleDelete, onRevert: () => setConfirmingRevert(true) })] }), isExpanded && (_jsxs("div", { className: "mt-3 pt-3 border-t border-dashed animate-in fade-in-0 slide-in-from-top-2 duration-300", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2", children: [_jsx(List, { className: "w-4 h-4" }), _jsx("span", { children: "\u0421\u043E\u0441\u0442\u0430\u0432 \u0430\u0440\u0435\u043D\u0434\u044B:" })] }), _jsx(EquipmentWithAccessoriesList, { equipment: rental.equipment, accessoryLinks: rental.accessory_links || [], title: "", showTitle: false, className: "border-t-0 pt-0" })] }))] }) }) }), _jsx(ConfirmationDialog, { open: isConfirmingRevert, onOpenChange: setConfirmingRevert, title: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0432\u044B\u0434\u0430\u0447\u0443 \u0430\u0440\u0435\u043D\u0434\u044B?", description: `Аренда #${rental.id} будет удалена, а исходный резерв #${rental.reservation_id} снова станет активным. Это действие нельзя будет отменить.`, confirmText: "\u0414\u0430, \u043E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0432\u044B\u0434\u0430\u0447\u0443", cancelText: "\u041D\u0430\u0437\u0430\u0434", onConfirm: handleRevert, variant: "destructive" }), _jsx(ConfirmationDialog, { open: isConfirmingPrepaymentRevert, onOpenChange: setConfirmingPrepaymentRevert, title: "\u041E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0430 \u0430\u0432\u0430\u043D\u0441\u0430", description: `При выдаче этой аренды был внесен аванс в размере ${rental.prepayment_amount.toLocaleString('ru-RU')} ₽. Что сделать с этой суммой?`, onConfirm: () => { }, children: _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: handleRevertAndKeep, children: "\u041E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435" }), _jsx(Button, { variant: "destructive", onClick: handleRevertAndRefund, children: "\u0421\u043F\u0438\u0441\u0430\u0442\u044C (\u0432\u0435\u0440\u043D\u0443\u0442\u044C)" })] }) })] }));
};
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AdminRentalCardComponent);
