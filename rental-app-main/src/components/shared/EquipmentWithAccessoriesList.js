import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/EquipmentWithAccessoriesList.tsx
import { useState } from "react";
import { Paperclip, ChevronDown, MinusCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isEquipmentUnderRepair } from "@/lib/equipmentUtils";
export default function EquipmentWithAccessoriesList({ equipment, accessoryLinks = [], title = "Состав резерва:", showTitle = true, className = "", showRemoveButton = false, onRemoveItem, isRemoveDisabled = false, removeButtonTitle = "Удалить из резерва" }) {
    const [expandedAccessories, setExpandedAccessories] = useState({});
    // Логирование для отладки отсутствующих аксессуаров
    const missingAccessories = accessoryLinks.filter(link => !link.accessory);
    if (missingAccessories.length > 0) {
        console.warn('Обнаружены AccessoryLink с отсутствующими accessory:', missingAccessories);
    }
    const toggleAccessories = (equipmentId) => {
        setExpandedAccessories(prev => ({
            ...prev,
            [equipmentId]: !prev[equipmentId]
        }));
    };
    if (equipment.length === 0) {
        return (_jsxs("div", { className: `space-y-2 pt-2 border-t ${className}`, children: [showTitle && (_jsx("h4", { className: "font-medium text-sm text-gray-800", children: title })), _jsx("div", { className: "text-sm text-gray-500 italic", children: "\u041D\u0435\u0442 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F \u0432 \u0440\u0435\u0437\u0435\u0440\u0432\u0435" })] }));
    }
    return (_jsxs("div", { className: `space-y-2 pt-2 border-t ${className}`, children: [showTitle && (_jsx("h4", { className: "font-medium text-sm text-gray-800", children: title })), _jsx("div", { className: "space-y-2", children: equipment.map((item) => {
                    // Фильтруем аксессуары, чтобы убедиться, что данные о них существуют
                    const accessoriesForItem = accessoryLinks.filter(link => link.equipment_id === item.id && link.accessory);
                    return (_jsxs("div", { className: "text-sm text-gray-700 bg-gray-50/70 p-2 rounded-md border", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("p", { children: ["\u2022 ", item.name] }), isEquipmentUnderRepair(item) && (_jsxs("div", { className: "flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200", children: [_jsx(AlertTriangle, { className: "w-3 h-3" }), _jsx("span", { children: "\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E" })] }))] }), showRemoveButton && onRemoveItem && (_jsx(Button, { variant: "ghost", size: "icon", onClick: () => onRemoveItem(item.id), className: `hover:text-rose-700 ${isRemoveDisabled ? "text-gray-400 cursor-not-allowed" : "text-rose-500"}`, title: removeButtonTitle, "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435", disabled: isRemoveDisabled, children: _jsx(MinusCircle, { className: "w-4 h-4" }) }))] }), accessoriesForItem.length > 0 && (_jsxs("div", { className: "mt-2 pl-4", children: [_jsxs("button", { onClick: () => toggleAccessories(item.id), className: "flex items-center text-xs text-sky-700 hover:underline font-medium", children: [_jsx(Paperclip, { className: "w-3 h-3 mr-1" }), "\u0410\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B (", accessoriesForItem.length, ")", _jsx(ChevronDown, { className: `w-4 h-4 ml-1 transition-transform ${expandedAccessories[item.id] ? 'rotate-180' : ''}` })] }), expandedAccessories[item.id] && (_jsx("ul", { className: "list-disc list-inside text-xs text-gray-600 mt-1 pl-2 animate-in fade-in duration-200", children: accessoriesForItem.map(link => {
                                            // Дополнительная защита на случай, если accessory стал null после фильтрации
                                            if (!link.accessory) {
                                                console.warn('Обнаружен AccessoryLink с отсутствующим accessory:', link);
                                                return null;
                                            }
                                            return (_jsx("li", { children: link.accessory.name }, link.accessory.id));
                                        }) }))] }))] }, item.id));
                }) })] }));
}
