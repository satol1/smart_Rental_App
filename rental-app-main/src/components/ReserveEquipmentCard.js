import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ReserveEquipmentCard.tsx
import { useState } from "react";
import { Trash2, Paperclip, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateRangeEuropean } from "@/lib/utils";
const statusTextMap = {
    available: "Свободно",
    reserved: "В резерве (другим)",
    rented: "В аренде (другим)",
    my_reservation: "В этом резерве",
};
const statusColorMap = {
    available: "text-green-600",
    reserved: "text-rose-500",
    rented: "text-red-600",
    my_reservation: "text-sky-700",
};
const bgColorMap = {
    available: "bg-white",
    reserved: "bg-rose-50 border-rose-200",
    rented: "bg-rose-100 border-rose-300",
    my_reservation: "bg-sky-50 border-sky-200",
};
function formatDateRange(start, end) {
    if (!start || !end)
        return "";
    return `(${formatDateRangeEuropean(start, end)})`;
}
export default function ReserveEquipmentCard({ equipment, availability, onRemove, 
// ✅ ПОЛУЧАЕМ НОВЫЕ СВОЙСТВА
isAccessorySelected, onToggleAccessory }) {
    const status = availability?.status ?? "available";
    const statusText = statusTextMap[status] || "Неизвестный статус";
    const colorClass = statusColorMap[status] || "text-gray-500";
    const bgClass = bgColorMap[status] || "bg-gray-50";
    const dateRange = (status === "reserved" || status === "rented")
        ? formatDateRange(availability?.start_date, availability?.end_date)
        : "";
    const isExternalConflict = status === "reserved" || status === "rented";
    // ✅ СОСТОЯНИЕ ДЛЯ ОТОБРАЖЕНИЯ СПИСКА АКСЕССУАРОВ
    const [showAccessories, setShowAccessories] = useState(false);
    return (_jsx(Card, { className: `rounded-xl px-4 py-4 sm:px-6 shadow-sm transition border w-full flex flex-col ${bgClass}`, children: _jsxs(CardContent, { className: "p-0 flex-1 flex flex-col sm:flex-row justify-between items-start gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-base sm:text-lg font-semibold mb-1", children: equipment.name }), _jsxs("p", { className: "text-xs sm:text-sm text-gray-500 mb-1", children: [equipment.brand, " \u2022 ", equipment.equipment_type] }), _jsxs("p", { className: "text-xs sm:text-sm mb-1", children: ["\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: ", _jsx("strong", { children: equipment.condition })] }), _jsxs("p", { className: "text-sm sm:text-base font-bold mb-1", children: [equipment.daily_rate, " \u20BD / \u0434\u0435\u043D\u044C"] }), _jsxs("p", { className: `text-sm font-semibold mt-2 ${colorClass}`, children: [statusText, dateRange && _jsx("span", { className: "ml-1 text-xs font-normal", children: dateRange })] }), equipment.accessories && equipment.accessories.length > 0 && (_jsxs("div", { className: "mt-3 border-t pt-3", children: [_jsxs("button", { className: "w-full flex justify-between items-center text-sm font-medium text-gray-600 hover:text-sky-700 p-1 -m-1 rounded", onClick: () => setShowAccessories(prev => !prev), children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Paperclip, { className: "w-4 h-4" }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B (", equipment.accessories.length, ")"] }), _jsx(ChevronDown, { className: `w-5 h-5 transition-transform ${showAccessories ? 'rotate-180' : ''}` })] }), showAccessories && (_jsx("div", { className: "mt-2 space-y-2 pl-1 animate-in fade-in-0 slide-in-from-top-2 duration-300", children: equipment.accessories.map(acc => (_jsxs("div", { className: "flex items-center justify-between p-1 rounded hover:bg-gray-50", children: [_jsxs(Label, { htmlFor: `reserve-acc-${equipment.id}-${acc.id}`, className: "flex items-center gap-2 text-xs font-normal cursor-pointer", children: [_jsx(Checkbox, { id: `reserve-acc-${equipment.id}-${acc.id}`, checked: isAccessorySelected(equipment.id, acc.id), onCheckedChange: () => onToggleAccessory(equipment.id, acc.id) }), acc.name] }), _jsxs("span", { className: "text-xs text-gray-500", children: [acc.price, " \u20BD"] })] }, acc.id))) }))] }))] }), _jsxs("button", { onClick: () => onRemove(equipment.id), className: `rounded px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium flex items-center gap-1 mt-1 self-start sm:self-center 
                        ${isExternalConflict
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-slate-500 text-white hover:bg-slate-600"}`, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437 \u0440\u0435\u0437\u0435\u0440\u0432\u0430", children: [_jsx(Trash2, { size: 14, className: "sm:size-4" }), "\u0423\u0434\u0430\u043B\u0438\u0442\u044C"] })] }) }));
}
