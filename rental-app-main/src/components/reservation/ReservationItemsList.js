import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/reservation/ReservationItemsList.tsx
import ReserveEquipmentCard from "@/components/ReserveEquipmentCard";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";
export default function ReservationItemsList({ items, selectedAccessories, availabilityMap, unavailableIdsFromAPI, invalidItems, onRemoveItem, onRemoveAccessory, 
// ✅ ПОЛУЧАЕМ НОВЫЕ СВОЙСТВА
isAccessorySelected, onToggleAccessory, }) {
    return (_jsx("div", { className: "space-y-4 pt-4", children: items.map((item) => {
            const selectedAccessoryIds = selectedAccessories[item.id] || [];
            const selectedAccessoryDetails = item.accessories?.filter(acc => selectedAccessoryIds.includes(acc.id)) || [];
            return (_jsxs("div", { className: `border rounded-lg overflow-hidden shadow-sm transition-all ${unavailableIdsFromAPI.includes(item.id) || invalidItems.includes(item.id)
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-white"}`, children: [_jsx(ReserveEquipmentCard, { equipment: item, availability: availabilityMap[item.id], onRemove: () => onRemoveItem(item.id), 
                        // ✅ ПЕРЕДАЕМ ФУНКЦИИ В КАРТОЧКУ
                        isAccessorySelected: isAccessorySelected, onToggleAccessory: onToggleAccessory }), selectedAccessoryDetails.length > 0 && (_jsxs("div", { className: "px-4 pb-3 pt-2 bg-slate-50 border-t border-dashed", children: [_jsxs("h4", { className: "flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2", children: [_jsx(Paperclip, { className: "h-3.5 w-3.5" }), "\u0414\u043E\u043F. \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B:"] }), _jsx("ul", { className: "space-y-1.5", children: selectedAccessoryDetails.map(acc => (_jsxs("li", { className: "flex items-center justify-between text-xs hover:bg-slate-100 p-1 rounded-md", children: [_jsx("span", { className: "text-gray-800", children: acc.name }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-gray-500 font-medium", children: [acc.price, " \u20BD"] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-5 w-5 text-gray-400 hover:text-red-500 hover:bg-red-50", onClick: () => onRemoveAccessory(item.id, acc.id), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440", "aria-label": `Удалить аксессуар ${acc.name}`, children: _jsx(X, { className: "h-3 w-3", "aria-hidden": "true" }) })] })] }, acc.id))) })] })), (unavailableIdsFromAPI.includes(item.id) || invalidItems.includes(item.id)) && (_jsx("p", { className: "text-sm text-red-600 px-4 pb-2 pt-0", children: "\u042D\u0442\u043E \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043D\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0434\u0430\u0442\u044B." }))] }, item.id));
        }) }));
}
