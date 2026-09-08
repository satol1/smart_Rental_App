import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/reservation/EditableEquipmentItem.tsx
import { X } from "lucide-react";
import EquipmentItemWithConflicts from "./EquipmentItemWithConflicts";
import { AvailableAccessoriesDropdown } from "./AvailableAccessoriesDropdown"; // <-- Новый импорт
import { Button } from "@/components/ui/button";
export default function EditableEquipmentItem({ itemDetail, fullEquipmentItem, isNew, hasConflict, availability, selectedAccessoryIds, onRemove, onToggleAccessory, disabled }) {
    if (!fullEquipmentItem) {
        return _jsx("div", { className: "p-3 bg-gray-100 rounded-md text-sm text-red-600", children: "\u041E\u0448\u0438\u0431\u043A\u0430: \u0434\u0430\u043D\u043D\u044B\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B." });
    }
    // Разделяем аксессуары на уже выбранные и доступные для выбора
    const selectedAccessoryDetails = fullEquipmentItem.accessories?.filter(acc => selectedAccessoryIds.includes(acc.id)) || [];
    const availableAccessoriesDetails = fullEquipmentItem.accessories?.filter(acc => !selectedAccessoryIds.includes(acc.id)) || [];
    return (_jsxs("div", { className: "bg-white p-3 rounded-md border", children: [_jsx(EquipmentItemWithConflicts, { item: itemDetail, isNew: isNew, hasConflict: hasConflict, availability: availability, onRemove: onRemove, disabled: disabled, equipmentCondition: fullEquipmentItem.condition }), selectedAccessoryDetails.length > 0 && (_jsxs("div", { className: "pl-8 pr-2 pt-2 border-t mt-2", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 mb-1", children: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0435 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B:" }), _jsx("ul", { className: "space-y-1", children: selectedAccessoryDetails.map(acc => (_jsxs("li", { className: "flex justify-between items-center text-xs text-gray-800 hover:bg-slate-50 p-1 rounded", children: [_jsxs("span", { children: ["- ", acc.name, " ", _jsxs("strong", { children: ["(", acc.price, " \u20BD)"] })] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-5 w-5 text-gray-400 hover:bg-red-50 hover:text-red-600", onClick: () => onToggleAccessory(fullEquipmentItem.id, acc.id), disabled: disabled, title: "\u0423\u0431\u0440\u0430\u0442\u044C \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440", "aria-label": `Убрать аксессуар ${acc.name}`, children: _jsx(X, { className: "w-3 h-3", "aria-hidden": "true" }) })] }, acc.id))) })] })), _jsx(AvailableAccessoriesDropdown, { accessories: availableAccessoriesDetails, equipmentId: fullEquipmentItem.id, onToggleAccessory: onToggleAccessory, disabled: disabled, hasTopBorder: selectedAccessoryDetails.length > 0 })] }));
}
