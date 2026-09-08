import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/equipment/EquipmentDetailsView.tsx
import { useState } from "react";
import { formatDateEuropean } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { Image as ImageIcon, Paperclip, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReserveStore } from "@/store/reserveStore";
export default function EquipmentDetailsView({ equipment, canViewAdminInfo, canToggleAccessories, isMainSelected, stagedAccessoryIds, onToggleStagedAccessory }) {
    const toggleAccessory = useReserveStore(state => state.toggleAccessory);
    const isAccessorySelected = useReserveStore(state => state.isAccessorySelected);
    // Состояние для управления текущим изображением
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    // 👇 ИЗМЕНЕНИЕ: Обработчик теперь разделяет логику
    const handleToggleAccessory = (accessoryId) => {
        // Если основной товар уже в резерве, работаем с глобальным стором
        if (isMainSelected) {
            toggleAccessory(equipment.id, accessoryId);
        }
        else {
            // Иначе - работаем с локальным состоянием "отмеченных"
            onToggleStagedAccessory(accessoryId);
        }
    };
    const allImages = [equipment.image_url, ...(equipment.image_urls || [])].filter(Boolean);
    // Обработчик клика по миниатюре
    const handleThumbnailClick = (index) => {
        setCurrentImageIndex(index);
    };
    return (_jsxs("div", { className: "space-y-4 text-sm", children: [allImages.length > 0 ? (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "w-full h-64 rounded-lg overflow-hidden bg-gray-100 border shadow-sm", children: _jsx("img", { src: allImages[currentImageIndex], alt: `${equipment.name} - изображение ${currentImageIndex + 1}`, className: "w-full h-full object-cover" }) }), allImages.length > 1 && (_jsx("div", { className: "flex overflow-x-auto space-x-2 pb-2", children: allImages.map((url, index) => (_jsx("div", { className: `flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border cursor-pointer transition-all ${index === currentImageIndex
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-gray-300'}`, onClick: () => handleThumbnailClick(index), children: _jsx("img", { src: url, alt: `${equipment.name} image ${index + 1}`, className: "w-full h-full object-cover" }) }, index))) }))] })) : (_jsx("div", { className: "w-full h-64 bg-gray-100 flex items-center justify-center rounded-lg border", children: _jsx(ImageIcon, { className: "w-16 h-16 text-gray-300" }) })), _jsxs("h3", { className: "text-base sm:text-lg font-bold text-gray-900 leading-tight pt-2", children: [equipment.equipment_type, " ", equipment.brand, " ", equipment.name] }), _jsxs("div", { className: "mt-2 space-y-1", children: [_jsxs("p", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0426\u0435\u043D\u0430:" }), " ", equipment.daily_rate, " \u20BD / \u0434\u0435\u043D\u044C"] }), _jsxs("p", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435:" }), " ", equipment.condition] })] }), equipment.accessories && equipment.accessories.length > 0 && (_jsxs("div", { className: "pt-3 mt-3 border-t", children: [_jsxs("p", { className: "font-semibold text-gray-800 mb-2 flex items-center gap-2", children: [_jsx(Paperclip, { className: "w-4 h-4 text-gray-500" }), "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B:"] }), _jsx("ul", { className: "space-y-1.5", children: equipment.accessories.map(acc => {
                            // 👇 ИЗМЕНЕНИЕ: Проверяем статус в зависимости от того, добавлен ли товар в резерв
                            const isAdded = isMainSelected
                                ? isAccessorySelected(equipment.id, acc.id)
                                : stagedAccessoryIds.has(acc.id);
                            return (_jsxs("li", { className: "flex justify-between items-center bg-gray-50/70 p-2 rounded-md hover:bg-gray-100 transition-colors", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: acc.name }), _jsxs("span", { className: "text-xs text-gray-600 ml-2", children: [acc.price, " \u20BD"] })] }), _jsx(Button, { size: "icon", variant: isAdded ? "default" : "outline", className: `h-7 w-7 shrink-0 ${isAdded ? 'bg-green-600 hover:bg-green-700' : ''}`, onClick: () => handleToggleAccessory(acc.id), "aria-label": isAdded ? "Убрать аксессуар" : "Добавить аксессуар", disabled: !canToggleAccessories, children: isAdded ? _jsx(Check, { className: "h-4 w-4" }) : _jsx(Plus, { className: "h-4 w-4" }) })] }, acc.id));
                        }) })] })), equipment.description && (_jsxs("div", { className: "pt-3 mt-3 border-t", children: [_jsx("p", { className: "font-semibold text-gray-800 mb-1", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435:" }), _jsx("div", { className: "prose prose-sm max-w-none text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200", children: _jsx(ReactMarkdown, { children: equipment.description }) })] })), canViewAdminInfo && (equipment.notes || equipment.last_maintenance) && (_jsxs("div", { className: "pt-3 mt-3 border-t space-y-2", children: [_jsx("h4", { className: "text-sm font-semibold text-sky-700", children: "\u0421\u043B\u0443\u0436\u0435\u0431\u043D\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F:" }), equipment.last_maintenance && (_jsxs("p", { className: "text-xs text-gray-600", children: [_jsx("strong", { children: "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u0422\u041E:" }), " ", formatDateEuropean(equipment.last_maintenance)] })), equipment.notes && (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold text-gray-600 mb-0.5", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438:" }), _jsx("p", { className: "text-xs text-gray-500 whitespace-pre-wrap bg-gray-50 p-2 rounded-md border border-gray-200", children: equipment.notes })] }))] }))] }));
}
