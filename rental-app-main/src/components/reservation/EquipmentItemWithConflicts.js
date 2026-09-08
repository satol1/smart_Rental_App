import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/reservation/EquipmentItemWithConflicts.tsx
import { Button } from "@/components/ui/button";
import { MinusCircle, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { formatDateRangeEuropean } from "@/lib/utils";
import { EQUIPMENT_UNDER_REPAIR_CONDITION } from "@/lib/equipmentUtils";
export default function EquipmentItemWithConflicts({ item, isNew, hasConflict, availability, onRemove, disabled = false, equipmentCondition }) {
    const getStatusInfo = () => {
        // Проверяем состояние оборудования в первую очередь
        if (equipmentCondition === EQUIPMENT_UNDER_REPAIR_CONDITION) {
            return {
                icon: _jsx(AlertTriangle, { className: "w-4 h-4" }),
                color: "text-amber-700",
                bgColor: "bg-amber-50 border-amber-200",
                status: "Временно недоступно",
                dateText: ""
            };
        }
        if (hasConflict && availability) {
            const dateRange = availability.start_date && availability.end_date
                ? formatDateRangeEuropean(availability.start_date, availability.end_date)
                : "";
            if (availability.status === "reserved") {
                return {
                    icon: _jsx(AlertTriangle, { className: "w-4 h-4" }),
                    color: "text-yellow-600",
                    bgColor: "bg-yellow-50 border-yellow-200",
                    status: "Зарезервировано",
                    dateText: dateRange
                };
            }
            else if (availability.status === "rented") {
                return {
                    icon: _jsx(AlertTriangle, { className: "w-4 h-4" }),
                    color: "text-red-600",
                    bgColor: "bg-red-50 border-red-200",
                    status: "В аренде",
                    dateText: dateRange
                };
            }
        }
        if (isNew) {
            return {
                icon: _jsx(Sparkles, { className: "w-4 h-4" }),
                color: "text-green-600",
                bgColor: "bg-green-50 border-green-200",
                status: "Новая позиция",
                dateText: ""
            };
        }
        return {
            icon: _jsx(CheckCircle, { className: "w-4 h-4" }),
            color: "text-gray-600",
            bgColor: "bg-gray-50 border-gray-200",
            status: "Доступно",
            dateText: ""
        };
    };
    const statusInfo = getStatusInfo();
    return (_jsxs("div", { className: `flex justify-between items-start p-3 rounded-md border transition-colors ${statusInfo.bgColor}`, children: [_jsx("div", { className: "flex-1 min-w-0", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx("div", { className: `flex-shrink-0 mt-0.5 ${statusInfo.color}`, children: statusInfo.icon }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-sm font-medium text-gray-900 truncate", children: item.label }), _jsxs("div", { className: `text-xs ${statusInfo.color} mt-1`, children: [statusInfo.status, statusInfo.dateText && (_jsxs("span", { className: "ml-1 font-normal", children: ["(", statusInfo.dateText, ")"] }))] }), hasConflict && (_jsx("div", { className: "text-xs text-red-600 mt-1 font-medium", children: "\u26A0\uFE0F \u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442: \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043D\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0434\u0430\u0442\u044B" }))] })] }) }), onRemove && (_jsx(Button, { variant: "ghost", size: "icon", onClick: () => onRemove(item.id), disabled: disabled, "aria-label": `Удалить ${item.label} из резерва`, className: `ml-2 h-8 w-8 flex-shrink-0 hover:text-red-700 ${disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : hasConflict
                        ? "text-red-500 hover:bg-red-100"
                        : "text-gray-500 hover:bg-gray-100"}`, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0440\u0435\u0437\u0435\u0440\u0432\u0430", children: _jsx(MinusCircle, { className: "w-4 h-4" }) }))] }));
}
