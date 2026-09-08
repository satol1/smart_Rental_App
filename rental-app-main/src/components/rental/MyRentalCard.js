import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/rental/MyRentalCard.tsx
import React, { useState, forwardRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import { MoneyText } from "@/components/ui/money-text";
import { CalendarRange, Truck, ExternalLink, ChevronDown, Paperclip, Tag, ReceiptText, Clock, AlertTriangle } from "lucide-react";
import { formatDateEuropean, calculateDaysOverdue } from "@/lib/utils";
import { useRentalToReservationNavigation } from "@/hooks/useRentalToReservationNavigation";
import { STATUS_CONFIG } from "@/constants/statusConstants";
const MyRentalCard = forwardRef(({ rental, highlightClasses = '' }, ref) => {
    const [expandedAccessories, setExpandedAccessories] = useState({});
    const { navigateToReservation } = useRentalToReservationNavigation({ context: 'user' });
    const toggleAccessories = useCallback((equipmentId) => {
        setExpandedAccessories(prev => ({
            ...prev,
            [equipmentId]: !prev[equipmentId]
        }));
    }, []);
    const start = rental.start_date ? new Date(rental.start_date) : null;
    const end = rental.end_date ? new Date(rental.end_date) : null;
    const actualReturn = rental.actual_return_date ? new Date(rental.actual_return_date) : null;
    const handleReservationClick = useCallback(() => {
        if (rental.reservation_id) {
            navigateToReservation(rental.reservation_id);
        }
    }, [rental.reservation_id, navigateToReservation]);
    // Логика для стилизации карточки в зависимости от статуса
    const statusClass = STATUS_CONFIG[rental.status]?.badgeClass || "bg-white hover:shadow-md";
    return (_jsxs(Card, { ref: ref, className: `p-4 space-y-4 transition-all duration-300 ${statusClass} ${highlightClasses}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Truck, { className: "w-5 h-5 text-orange-600" }), _jsxs("h3", { className: "text-lg font-semibold text-gray-900", children: ["\u0410\u0440\u0435\u043D\u0434\u0430 #", rental.id] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(StatusBadge, { status: rental.status }), rental.reservation_id && (_jsxs(Button, { variant: "outline", size: "sm", onClick: handleReservationClick, className: "text-sky-600 hover:text-sky-700 hover:bg-sky-50 border-sky-200", children: [_jsx(ExternalLink, { className: "w-3 h-3 mr-1" }), "\u0420\u0435\u0437\u0435\u0440\u0432 #", rental.reservation_id] }))] })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-600", children: [_jsx(CalendarRange, { className: "w-4 h-4" }), _jsx("span", { children: start && end && (_jsxs(_Fragment, { children: [formatDateEuropean(start), " - ", formatDateEuropean(end)] })) })] }), actualReturn && (_jsxs("div", { className: "text-sm text-gray-600", children: [_jsx("span", { className: "font-medium", children: "\u0412\u043E\u0437\u0432\u0440\u0430\u0442:" }), " ", formatDateEuropean(actualReturn)] })), _jsxs("div", { className: "space-y-2 pt-3 border-t", children: [_jsx("h4", { className: "font-medium text-sm text-gray-800", children: "\u0421\u043E\u0441\u0442\u0430\u0432 \u0430\u0440\u0435\u043D\u0434\u044B:" }), _jsx("div", { className: "space-y-2", children: rental.equipment.map((item) => {
                            const accessoriesForItem = rental.accessory_links?.filter(link => link.equipment_id === item.id);
                            return (_jsxs("div", { className: "text-sm text-gray-700 bg-gray-50/70 p-2 rounded-md border", children: [_jsxs("p", { children: ["\u2022 ", item.name] }), accessoriesForItem && accessoriesForItem.length > 0 && (_jsxs("div", { className: "mt-2 pl-4", children: [_jsxs("button", { onClick: () => toggleAccessories(item.id), className: "flex items-center text-xs text-sky-700 hover:underline font-medium", children: [_jsx(Paperclip, { className: "w-3 h-3 mr-1" }), "\u0410\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B (", accessoriesForItem.length, ")", _jsx(ChevronDown, { className: `w-4 h-4 ml-1 transition-transform ${expandedAccessories[item.id] ? 'rotate-180' : ''}` })] }), expandedAccessories[item.id] && (_jsx("ul", { className: "list-disc list-inside text-xs text-gray-600 mt-1 pl-2 animate-in fade-in duration-200", children: accessoriesForItem.map(link => (_jsx("li", { children: link.accessory.name }, link.accessory.id))) }))] }))] }, item.id));
                        }) })] }), _jsxs("div", { className: "flex items-start justify-between pt-3 border-t flex-wrap-reverse gap-4", children: [_jsxs("div", { className: "text-xs space-y-1.5 text-slate-700 flex-grow", children: [_jsxs("h4", { className: "font-semibold text-sm text-slate-800 flex items-center gap-2 mb-2", children: [_jsx(ReceiptText, { className: "w-4 h-4" }), "\u0424\u0438\u043D\u0430\u043D\u0441\u044B"] }), _jsxs("div", { className: "flex justify-between gap-4", children: [_jsx("span", { children: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0430\u0440\u0435\u043D\u0434\u044B:" }), " ", _jsx("span", { className: "font-medium", children: _jsx(MoneyText, { value: rental.total_cost }) })] }), rental.discount_amount > 0 && (_jsxs("div", { className: "flex justify-between gap-4 text-green-600", children: [_jsx("span", { children: "\u0421\u043A\u0438\u0434\u043A\u0430:" }), " ", _jsxs("span", { className: "font-medium", children: ["- ", _jsx(MoneyText, { value: rental.discount_amount })] })] })), rental.promo_code && (_jsxs("div", { className: "flex justify-between items-center gap-4 text-purple-600", children: [_jsx("span", { children: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434:" }), " ", _jsxs("span", { className: "font-medium flex items-center gap-1", children: [_jsx(Tag, { className: "w-3 h-3" }), rental.promo_code] })] })), rental.overdue_surcharge && rental.overdue_surcharge > 0 && (_jsxs("div", { className: "flex justify-between gap-4 text-red-600 font-bold pt-1 border-t border-dashed mt-1", children: [_jsx("span", { children: "\u0414\u043E\u043F\u043B\u0430\u0442\u0430 \u0437\u0430 \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u043A\u0443:" }), " ", _jsx("span", { children: _jsx(MoneyText, { value: rental.overdue_surcharge }) })] }))] }), (() => {
                        if (rental.status === 'overdue') {
                            const daysOverdue = calculateDaysOverdue(rental.end_date, rental.overdue_days);
                            return (_jsxs("div", { className: "flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-red-600 bg-red-100/60 border-red-200", children: [_jsx(AlertTriangle, { className: "w-4 h-4" }), `Просрочена на ${daysOverdue} дн.`] }));
                        }
                        if (rental.status === 'active' && rental.days_remaining !== null) {
                            const daysLeft = rental.days_remaining;
                            if (daysLeft <= 1) {
                                return (_jsxs("div", { className: "flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-orange-600 bg-orange-100/60 border-orange-200", children: [_jsx(Clock, { className: "w-4 h-4" }), `Остался ${daysLeft} день`] }));
                            }
                            return (_jsxs("div", { className: "flex items-center gap-2 px-2 py-1 rounded-md border text-xs font-medium text-green-700 bg-green-100/60 border-green-200", children: [_jsx(Clock, { className: "w-4 h-4" }), `Осталось ${daysLeft} дн.`] }));
                        }
                        return null;
                    })()] }), rental.notes_on_issue && (_jsx("div", { className: "pt-2 border-t", children: _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u0440\u0438 \u0432\u044B\u0434\u0430\u0447\u0435:" }), _jsx("p", { className: "text-gray-600 mt-1", children: rental.notes_on_issue })] }) })), rental.notes_on_return && (_jsx("div", { className: "pt-2 border-t", children: _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438 \u043F\u0440\u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0435:" }), _jsx("p", { className: "text-gray-600 mt-1", children: rental.notes_on_return })] }) }))] }));
});
MyRentalCard.displayName = 'MyRentalCard';
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(MyRentalCard);
