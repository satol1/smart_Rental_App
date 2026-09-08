import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/ReservationFinancialSummary.tsx
import { useMemo } from "react";
import { usePriceCalculator } from "@/hooks/reservation/usePriceCalculator";
import { AlertCircle, Loader2, ReceiptText } from "lucide-react";
import { MoneyText } from "@/components/ui/money-text";
export default function ReservationFinancialSummary({ reservation, open, hasConflicts, conflictingItemIds, isCheckingAvailability, equipmentMap }) {
    const { newStartDate, newEndDate, newDateRangeIsValid } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const originalEndDate = new Date(reservation.end_date);
        return {
            newStartDate: today,
            newEndDate: originalEndDate,
            newDateRangeIsValid: originalEndDate > today,
        };
    }, [reservation]);
    const { data: priceDetails, isFetching: isCalculatingPrice, error: priceError } = usePriceCalculator({
        equipmentIds: reservation.equipment_ids || [],
        startDate: newStartDate,
        endDate: newEndDate,
        selectedAccessories: reservation.selected_accessories || {},
        promoCode: reservation.promo_code || undefined,
        enabled: open && newDateRangeIsValid,
    });
    const finalCost = priceDetails?.final_total ?? reservation.total_cost ?? 0;
    // +++ Получаем имена конфликтного оборудования +++
    const conflictingEquipmentNames = useMemo(() => conflictingItemIds.map(id => equipmentMap.get(id)?.name).filter(Boolean).join(', '), [conflictingItemIds, equipmentMap]);
    return (_jsxs("div", { className: "p-3 bg-slate-50 border rounded-lg space-y-2", children: [_jsxs("h4", { className: "flex items-center gap-2 text-sm font-semibold text-gray-800", children: [_jsx(ReceiptText, { className: "w-5 h-5 text-sky-600" }), "\u0424\u0438\u043D\u0430\u043D\u0441\u043E\u0432\u0430\u044F \u0441\u0432\u043E\u0434\u043A\u0430"] }), (isCalculatingPrice || isCheckingAvailability) ? (_jsxs("div", { className: "flex items-center justify-center gap-2 text-sm text-gray-500 py-4", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), isCheckingAvailability ? "Проверка доступности..." : "Пересчет стоимости..."] })) : hasConflicts ? (
            // +++ НАЧАЛО: Новый блок для отображения ошибки конфликта +++
            _jsxs("div", { className: "text-sm text-red-700 font-medium p-2 bg-red-100 border border-red-200 rounded-md space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx("span", { children: "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F!" })] }), _jsxs("p", { className: "text-xs font-normal pl-6", children: ["\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0432 \u043D\u043E\u0432\u043E\u043C \u043F\u0435\u0440\u0438\u043E\u0434\u0435: ", _jsx("strong", { children: conflictingEquipmentNames }), "."] })] })
            // +++ КОНЕЦ: Новый блок +++
            ) : priceError || !newDateRangeIsValid ? (_jsxs("div", { className: "flex items-center gap-2 text-sm text-red-600 font-medium p-2 bg-red-50 rounded-md", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx("span", { children: priceError ? "Не удалось рассчитать цену." : "Невозможно выдать: резерв уже закончился." })] })) : (_jsxs("div", { className: "text-xs text-gray-700 space-y-1.5 border-t pt-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u041F\u0435\u0440\u0438\u043E\u0434 \u0440\u0435\u0437\u0435\u0440\u0432\u0430:" }), _jsxs("span", { className: "font-medium", children: [new Date(reservation.start_date).toLocaleDateString(), " - ", new Date(reservation.end_date).toLocaleDateString()] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u0421\u0442\u043E\u0438\u043C\u043E\u0441\u0442\u044C \u0440\u0435\u0437\u0435\u0440\u0432\u0430:" }), _jsx("span", { className: "font-medium", children: _jsx(MoneyText, { value: reservation.total_cost }) })] }), _jsx("hr", { className: "border-dashed my-1" }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\u041D\u043E\u0432\u044B\u0439 \u043F\u0435\u0440\u0438\u043E\u0434 \u0430\u0440\u0435\u043D\u0434\u044B:" }), _jsxs("span", { className: "font-medium", children: [newStartDate?.toLocaleDateString(), " - ", newEndDate?.toLocaleDateString()] })] }), priceDetails && (priceDetails.discount_amount > 0) && (() => {
                        const totalDiscountPercentage = (priceDetails.duration_discount_percentage || 0) + (priceDetails.promo_discount_percentage || 0);
                        return (_jsxs("div", { className: "flex justify-between text-green-600", children: [_jsxs("span", { children: ["\u0421\u043A\u0438\u0434\u043A\u0430 (", totalDiscountPercentage.toFixed(0), "%):"] }), _jsxs("span", { className: "font-medium", children: ["- ", _jsx(MoneyText, { value: priceDetails.discount_amount })] })] }));
                    })(), _jsxs("div", { className: "flex justify-between text-base font-bold pt-1 border-t mt-1", children: [_jsx("span", { children: "\u0418\u0442\u043E\u0433\u043E \u043A \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044E \u0441 \u0431\u0430\u043B\u0430\u043D\u0441\u0430:" }), _jsx("span", { className: "text-sky-700", children: _jsx(MoneyText, { value: finalCost }) })] })] }))] }));
}
