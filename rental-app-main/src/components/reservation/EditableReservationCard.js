import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/reservation/EditableReservationCard.tsx
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Save, X, AlertTriangle, Sparkles, Info } from "lucide-react";
import EditableDateRange from "./EditableDateRange";
import FinancialSummaryBlock from "@/components/shared/FinancialSummaryBlock";
import EditableEquipmentItem from "./EditableEquipmentItem";
import { useReservationEditContext } from "@/contexts/ReservationEditContext";
import { useReservationNavigation } from "@/hooks/useReservationNavigation";
import HolidayConfirmationDialog from "./HolidayConfirmationDialog";
import { formatDateEuropean } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useProfile";
import { canUserEditReservation, mapLegacyUserStatus, EDIT_RESTRICTION_DAYS } from "@/constants/userStatusConstants";
import { daysUntilDate } from "@/utils/dates";
export default function EditableReservationCard() {
    const { reservationId, editState, availabilityMap, equipmentMap, hasConflicts, saveChanges, cancelEdit, updateDates, removeEquipmentItem, isLoading, isCheckingAvailability, isSaving, localSelectedAccessories, toggleAccessory, holidayConflict, confirmHolidayAdjustment, cancelHolidayAdjustment, isHolidayValid, priceDetails, financials, promoCode, setPromoCode, applyPromoCode, removePromoCode, isAdminContext, reservationCreatedAt, } = useReservationEditContext();
    const { data: currentUser } = useCurrentUser();
    const { goToEquipmentSelection } = useReservationNavigation(); // <-- ИСПОЛЬЗОВАНИЕ ХУКА
    const displayNewItemsCount = editState.newlyAddedEquipmentIdsAsArray.length;
    const equipmentToDisplay = editState.currentEquipmentDetails;
    const totalItemsInEdit = equipmentToDisplay.length;
    // Проверка прав на редактирование (только для обычных пользователей, не админов)
    const canEditByStatus = useMemo(() => {
        if (isAdminContext)
            return true; // Менеджеры всегда могут редактировать
        if (!currentUser?.status)
            return false;
        // Используем маппинг старых статусов для обратной совместимости
        const userStatus = mapLegacyUserStatus(currentUser.status);
        if (!userStatus)
            return false;
        const daysUntilStart = daysUntilDate(editState.startDate);
        return canUserEditReservation(userStatus, daysUntilStart, reservationCreatedAt);
    }, [isAdminContext, currentUser?.status, editState.startDate, reservationCreatedAt]);
    const editRestrictionMessage = useMemo(() => {
        if (isAdminContext || canEditByStatus)
            return null;
        const daysUntilStart = daysUntilDate(editState.startDate);
        const userStatus = mapLegacyUserStatus(currentUser?.status);
        if (daysUntilStart <= 0) {
            return "Резерв уже начался. Для редактирования обратитесь к менеджеру.";
        }
        // Порог берём по статусу пользователя, а не по числу дней
        const restrictionDays = userStatus ? EDIT_RESTRICTION_DAYS[userStatus] : 2;
        return (`Редактирование доступно не позднее чем за ${restrictionDays + 1} дн. до начала ` +
            `(ваш статус: «${userStatus ?? "Новый"}»). До начала ${daysUntilStart} дн. ` +
            "Для изменения резерва обратитесь к менеджеру.");
    }, [isAdminContext, canEditByStatus, editState.startDate, currentUser?.status]);
    const onAddEquipment = () => {
        // Централизованный переход на страницу выбора оборудования
        goToEquipmentSelection({
            id: reservationId,
            start_date: editState.startDate.toISOString(),
            end_date: editState.endDate.toISOString(),
            equipment_ids: editState.currentEquipmentDetails.map(eq => eq.id),
            status: 'active',
        }, isAdminContext);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Card, { className: "w-full px-5 py-4 rounded-2xl border shadow-md bg-blue-50 border-blue-300 transition-all", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "text-base font-semibold text-blue-700", children: ["\u270F\uFE0F \u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u0430 #", reservationId] }), isCheckingAvailability && (_jsxs("div", { className: "flex items-center gap-1 text-xs text-blue-600", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin" }), "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u0438..."] }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { variant: "outline", className: "bg-blue-100 text-blue-700 border-blue-300", children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435" }), displayNewItemsCount > 0 && (_jsxs(Badge, { variant: "outline", className: "bg-green-100 text-green-700 border-green-300", children: [_jsx(Sparkles, { className: "w-3 h-3 mr-1" }), "+", displayNewItemsCount, " \u043D\u043E\u0432\u044B\u0445"] }))] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "md:col-span-2 space-y-4", children: [editRestrictionMessage && (_jsxs(Alert, { variant: "default", className: "border-amber-200 bg-amber-50", children: [_jsx(Info, { className: "h-4 w-4 text-amber-600" }), _jsx(AlertDescription, { className: "text-amber-800", children: editRestrictionMessage })] })), hasConflicts && (_jsxs("div", { className: "flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "text-sm text-red-700", children: [_jsx("div", { className: "font-medium", children: "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D\u044B \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u044B!" }), _jsx("div", { className: "text-xs mt-1", children: "\u041D\u0435\u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043D\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0434\u0430\u0442\u044B. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0438\u0441\u043F\u0440\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u044B \u043F\u0435\u0440\u0435\u0434 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435\u043C." })] })] })), _jsx(EditableDateRange, { startDate: editState.startDate, endDate: editState.endDate, onChange: updateDates, disabled: isLoading }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "text-sm font-medium text-gray-700", children: ["\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 (", totalItemsInEdit, " \u043F\u043E\u0437.", displayNewItemsCount > 0 && (_jsxs("span", { className: "text-green-600", children: [", \u0438\u0437 \u043D\u0438\u0445 ", displayNewItemsCount, " \u043D\u043E\u0432\u044B\u0445"] })), "):"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: onAddEquipment, disabled: isLoading, className: "text-xs px-3 py-1 h-7", children: [_jsx(Plus, { className: "w-3 h-3 mr-1" }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"] })] }), totalItemsInEdit === 0 ? (_jsxs("div", { className: "text-sm text-gray-500 text-center py-6 border border-dashed border-gray-300 rounded-md", children: ["\u041D\u0435\u0442 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F \u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u0435.", " ", _jsx("button", { onClick: onAddEquipment, disabled: isLoading, className: "text-blue-600 hover:underline", children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435" })] })) : (_jsx("div", { className: "space-y-2", children: equipmentToDisplay.map((itemDetail) => {
                                                        const availability = availabilityMap[itemDetail.id];
                                                        const itemHasConflict = !!availability && (availability.status === "reserved" || availability.status === "rented");
                                                        const isNew = editState.newlyAddedEquipmentIdsAsArray.includes(itemDetail.id);
                                                        return (_jsx(EditableEquipmentItem, { itemDetail: itemDetail, fullEquipmentItem: equipmentMap.get(itemDetail.id), isNew: isNew, hasConflict: itemHasConflict, availability: availability, selectedAccessoryIds: localSelectedAccessories[itemDetail.id] || [], onRemove: () => removeEquipmentItem(itemDetail.id), onToggleAccessory: toggleAccessory, disabled: isLoading }, itemDetail.id));
                                                    }) }))] })] }), _jsx("div", { className: "md:col-span-1", children: _jsx(FinancialSummaryBlock, { priceDetails: priceDetails, promoCode: promoCode, setPromoCode: setPromoCode, applyPromoCode: applyPromoCode, removePromoCode: removePromoCode, promoCodeMessage: financials.promoCodeMessage, isLoading: isCheckingAvailability, hasConflicts: hasConflicts, variant: "inline", showActions: false }) })] }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-blue-200 mt-4", children: [_jsxs(Button, { variant: "ghost", onClick: cancelEdit, disabled: isLoading, className: "text-sm mr-auto", children: [_jsx(X, { className: "w-4 h-4 mr-1" }), "\u041E\u0442\u043C\u0435\u043D\u0430"] }), _jsx(Button, { onClick: () => saveChanges(), disabled: !editState.hasChanges || hasConflicts || !isHolidayValid || isLoading || totalItemsInEdit === 0, className: "text-sm min-w-[120px]", children: isSaving ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-1 animate-spin" }), "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-4 h-4 mr-1" }), "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"] })) })] }), _jsxs("div", { className: "text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-2 space-y-1 mt-4", children: [_jsx("div", { children: "\uD83D\uDCA1 \u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438:" }), _jsxs("ul", { className: "space-y-0.5 ml-3", children: [_jsx("li", { children: "\u2022 \u0417\u0435\u043B\u0435\u043D\u044B\u043C \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u043D\u043E\u0432\u044B\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438, \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u043F\u0440\u0438 \u0442\u0435\u043A\u0443\u0449\u0435\u043C \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0438." }), _jsx("li", { children: "\u2022 \u0416\u0435\u043B\u0442\u044B\u043C/\u043A\u0440\u0430\u0441\u043D\u044B\u043C \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u044B \u0441 \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430\u043C\u0438." }), _jsx("li", { children: "\u2022 \u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435\" \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u043E\u0437\u0438\u0446\u0438\u0439." }), _jsx("li", { children: "\u2022 \u041A\u043D\u043E\u043F\u043A\u0430 \"\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C\" \u0430\u043A\u0442\u0438\u0432\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u043D\u0430\u043B\u0438\u0447\u0438\u0438 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439, \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0438 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u043E\u0432 \u0438 \u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0445 \u0434\u0430\u0442\u0430\u0445." }), _jsx("li", { children: "\u2022 \u041F\u043E\u0441\u043B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u043D\u043E\u0432\u044B\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0441\u0442\u0430\u043D\u0443\u0442 \u043E\u0431\u044B\u0447\u043D\u044B\u043C\u0438 \u0447\u0430\u0441\u0442\u044F\u043C\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u0430." })] })] })] }) }), _jsx(HolidayConfirmationDialog, { open: !!holidayConflict, message: holidayConflict?.message || "", suggestedDate: holidayConflict ? formatDateEuropean(new Date(holidayConflict.suggested_end_date)) : "", onConfirm: confirmHolidayAdjustment, onCancel: cancelHolidayAdjustment, isConfirming: isSaving })] }));
}
