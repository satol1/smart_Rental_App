import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/EquipmentSelector.tsx
import { useState } from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronRight } from "lucide-react";
import ConflictIndicator from "./ConflictIndicator";
import { cn } from "@/lib/utils";
/**
 * Переиспользуемый компонент для выбора оборудования с группировкой по типам и брендам.
 * Показывает конфликты доступности и поддерживает поиск.
 */
export default function EquipmentSelector({ name, control, label, equipment, availabilityMap, isLoading, searchQuery, onSearchChange, error, disabled = false, className }) {
    const [collapsedSections, setCollapsedSections] = useState({});
    const toggleSection = (key) => {
        setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };
    // Группируем оборудование по типам и брендам
    const groupedEquipment = equipment.reduce((acc, item) => {
        if (!acc[item.equipment_type]) {
            acc[item.equipment_type] = {};
        }
        if (!acc[item.equipment_type][item.brand]) {
            acc[item.equipment_type][item.brand] = [];
        }
        acc[item.equipment_type][item.brand].push(item);
        return acc;
    }, {});
    return (_jsxs("div", { className: cn("space-y-2", className), children: [_jsx(Label, { children: label }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "\u041F\u043E\u0438\u0441\u043A...", value: searchQuery, onChange: (e) => onSearchChange(e.target.value), className: "pl-10", disabled: disabled })] }), _jsx("div", { className: "rounded-md border", children: isLoading ? (_jsx("p", { className: "text-center py-4", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." })) : (_jsx(ScrollArea, { className: "h-[400px]", children: _jsx("div", { className: "p-2", children: _jsx(Controller, { name: name, control: control, render: ({ field }) => (_jsx("div", { className: "space-y-3", children: Object.keys(groupedEquipment).map(type => {
                                    const isTypeCollapsed = collapsedSections[type];
                                    return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => toggleSection(type), className: "w-full flex items-center gap-1 font-semibold text-md sticky top-0 bg-white/80 backdrop-blur-sm py-1 cursor-pointer z-10", children: [_jsx(ChevronRight, { className: cn("w-4 h-4 transition-transform", !isTypeCollapsed && "rotate-90") }), type] }), !isTypeCollapsed && Object.keys(groupedEquipment[type]).map(brand => {
                                                const brandKey = `${type}-${brand}`;
                                                const isBrandCollapsed = collapsedSections[brandKey];
                                                return (_jsxs("div", { className: "pl-4", children: [_jsxs("button", { type: "button", onClick: () => toggleSection(brandKey), className: "w-full flex items-center gap-1 font-medium text-sm text-gray-600 hover:text-black", children: [_jsx(ChevronRight, { className: cn("w-4 h-4 transition-transform", !isBrandCollapsed && "rotate-90") }), brand] }), !isBrandCollapsed && (_jsx("div", { className: "space-y-1 pl-4 border-l ml-2 py-1", children: groupedEquipment[type][brand].map(item => {
                                                                const availability = availabilityMap[item.id];
                                                                const hasConflict = availability && availability.status !== 'available';
                                                                return (_jsxs("div", { className: cn("p-2 rounded-md transition-colors", hasConflict && (availability.status === 'rented' ? 'bg-red-100' : 'bg-amber-100'), !hasConflict && "hover:bg-gray-50"), children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Checkbox, { id: `eq-${item.id}`, checked: field.value?.includes(item.id) || false, onCheckedChange: (checked) => {
                                                                                        const currentIds = field.value || [];
                                                                                        const newIds = checked
                                                                                            ? [...currentIds, item.id]
                                                                                            : currentIds.filter((id) => id !== item.id);
                                                                                        field.onChange(newIds);
                                                                                    }, disabled: disabled }), _jsxs(Label, { htmlFor: `eq-${item.id}`, className: "font-normal w-full cursor-pointer text-sm", children: [item.brand, " ", item.name] })] }), hasConflict && (_jsx("div", { className: "mt-1 pl-8", children: _jsx(ConflictIndicator, { availability: availability, variant: "block", showDetails: true }) }))] }, item.id));
                                                            }) }))] }, brandKey));
                                            })] }, type));
                                }) })) }) }) })) }), error && (_jsx("p", { className: "text-xs text-red-600", children: error }))] }));
}
