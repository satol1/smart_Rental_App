import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/AdminReservationCard.tsx
import React, { useState, useMemo, useEffect, forwardRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Edit, Package, Trash2, User, Truck, List } from "lucide-react";
import { formatDateEuropean, cn } from "@/lib/utils";
import { useDeleteAdminReservation } from "@/hooks/useAdminReservations";
import { ReservationEditProvider } from "@/contexts/ReservationEditProvider";
import EditableReservationCard from "@/components/reservation/EditableReservationCard";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminReservationSelectionStore } from "@/store/adminReservationSelectionStore";
import EquipmentWithAccessoriesList from "@/components/shared/EquipmentWithAccessoriesList";
import FinancialInfoBlock from "@/components/shared/FinancialInfoBlock";
import StatusBadge from "@/components/shared/StatusBadge";
import { useNavigate, useLocation } from "react-router-dom";
import { STATUS_CONFIG } from "@/constants/statusConstants";
const AdminReservationCard = forwardRef(({ reservation, onConvertToRental, equipmentMap, highlightClasses = '' }, ref) => {
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
        const state = location.state;
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
    const initialEquipmentForDisplay = useMemo(() => reservation.equipment_ids
        .map(id => {
        const equipment = equipmentMap.get(id);
        if (!equipment) {
            return { id, label: `Оборудование #${id} (не найдено)` };
        }
        return { id, label: `${equipment.equipment_type} ${equipment.brand} ${equipment.name}` };
    }), [reservation.equipment_ids, equipmentMap]);
    const equipmentListForDisplay = useMemo(() => reservation.equipment_ids.map(id => {
        const equipment = equipmentMap.get(id);
        return equipment
            ? `${equipment.equipment_type} ${equipment.brand} ${equipment.name}`
            : `Оборудование #${id} (не найдено)`;
    }), [reservation.equipment_ids, equipmentMap]);
    // Условный возврат после всех хуков
    if (isEditing) {
        return (_jsx(ReservationEditProvider, { reservation: reservation, initialEquipmentForDisplay: initialEquipmentForDisplay, onFullCancellation: handleDelete, isAdminContext: true, onFinishEditing: () => setIsEditing(false), children: _jsx(EditableReservationCard, {}) }));
    }
    const statusClass = STATUS_CONFIG[reservation.status]?.badgeClass || "bg-white hover:shadow-md";
    const highlightClass = isSelected
        ? 'ring-2 ring-sky-500 border-sky-400'
        : 'border-gray-200';
    return (_jsxs("div", { ref: ref, className: `relative w-full rounded-lg border transition-all hover:shadow-md ${highlightClass} ${highlightClasses}`, children: [_jsx("div", { className: "absolute top-4 left-4 z-10", children: _jsx(Checkbox, { checked: isSelected, onCheckedChange: () => toggleId(reservation.id), "aria-label": `Выбрать резерв #${reservation.id}`, className: "bg-white h-5 w-5" }) }), _jsx(Card, { className: cn("w-full", statusClass), children: _jsxs(CardContent, { className: "p-4 pl-12", children: [_jsxs("div", { className: "flex flex-col md:flex-row gap-4 justify-between", children: [_jsxs("div", { className: "flex-1 space-y-2.5", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("h3", { className: `font-bold text-lg text-indigo-700 ${reservation.status === 'active' || reservation.status === 'overdue' ? 'cursor-pointer hover:text-indigo-800 hover:underline transition-colors' : ''}`, onClick: reservation.status === 'active' || reservation.status === 'overdue' ? () => setIsEditing(true) : undefined, children: ["\u0420\u0435\u0437\u0435\u0440\u0432 #", reservation.id] }), _jsx(StatusBadge, { status: reservation.status })] }), _jsxs("div", { className: "text-sm text-gray-700 space-y-1.5 pl-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(User, { className: "w-4 h-4 text-gray-500" }), _jsxs("span", { children: [reservation.user_info.full_name, " (", reservation.user_info.email, ")"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "w-4 h-4 text-gray-500" }), _jsxs("span", { children: [formatDateEuropean(reservation.start_date), " \u2014 ", formatDateEuropean(reservation.end_date)] })] }), _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Package, { className: "w-4 h-4 text-gray-500 mt-1 flex-shrink-0" }), _jsx("div", { className: "flex-1", children: _jsx("div", { className: "flex items-center text-left w-full", children: _jsxs("span", { children: ["\u041F\u043E\u0437\u0438\u0446\u0438\u0439 \u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u0435: ", equipmentListForDisplay.length] }) }) })] })] })] }), _jsx(FinancialInfoBlock, { totalCost: reservation.total_cost, discountAmount: reservation.discount_amount, promoCode: reservation.promo_code, variant: "admin" }), _jsxs("div", { className: "flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4", children: [(reservation.status === 'active' || reservation.status === 'overdue') ? (_jsxs(_Fragment, { children: [_jsxs(Button, { onClick: () => onConvertToRental(reservation), size: "sm", className: "bg-green-600 hover:bg-green-700 w-full md:w-auto", children: [_jsx(Truck, { className: "mr-2 h-4 w-4" }), "\u0412\u044B\u0434\u0430\u0442\u044C \u0432 \u0430\u0440\u0435\u043D\u0434\u0443"] }), _jsxs(Button, { onClick: () => setIsEditing(true), size: "sm", variant: "outline", className: "w-full md:w-auto", children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C"] })] })) : (_jsx("div", { className: "text-sm text-gray-500 flex items-center gap-2 pr-2", children: _jsx("span", { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0439 \u043D\u0435\u0442" }) })), reservation.status === 'fulfilled' && reservation.rental_id && (_jsxs(Button, { onClick: handleNavigateToRental, size: "sm", variant: "outline", className: "w-full md:w-auto text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200", children: [_jsx(Truck, { className: "mr-2 h-4 w-4" }), "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0430\u0440\u0435\u043D\u0434\u0435"] })), _jsxs(Button, { onClick: handleDelete, size: "sm", variant: "destructive", disabled: deleteReservationMutation.isPending, className: "w-full md:w-auto", children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), deleteReservationMutation.isPending ? "Удаление..." : "Удалить"] })] })] }), equipmentListForDisplay.length > 0 && (_jsxs("div", { className: "mt-3 pt-3 border-t border-dashed animate-in fade-in-0 slide-in-from-top-2 duration-300", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2", children: [_jsx(List, { className: "w-4 h-4" }), _jsx("span", { children: "\u0421\u043E\u0441\u0442\u0430\u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u0430:" })] }), _jsx(EquipmentWithAccessoriesList, { equipment: reservation.equipment_ids.map(equipmentId => {
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
                                            };
                                        }
                                        return equipment;
                                    }), accessoryLinks: reservation.accessory_links || [], title: "", showTitle: false, className: "border-t-0 pt-0" })] }))] }) })] }));
});
AdminReservationCard.displayName = 'AdminReservationCard';
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AdminReservationCard);
