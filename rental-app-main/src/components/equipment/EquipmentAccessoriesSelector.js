import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/equipment/EquipmentAccessoriesSelector.tsx
import { useState, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List } from "lucide-react";
export default function EquipmentAccessoriesSelector({ allAccessories, isLoadingAccessories }) {
    const { control } = useFormContext();
    // Состояние для управления фильтром по типу аксессуаров
    const [accessoryTypeFilter, setAccessoryTypeFilter] = useState(null);
    // Получаем уникальные типы аксессуаров
    const accessoryTypes = useMemo(() => {
        if (!allAccessories)
            return [];
        const types = new Set(allAccessories.map(acc => acc.accessory_type || "Прочее"));
        return Array.from(types).sort();
    }, [allAccessories]);
    // Фильтруем аксессуары по выбранному типу
    const filteredAccessories = useMemo(() => {
        if (!accessoryTypeFilter) {
            return allAccessories; // Если фильтр не выбран, показываем все
        }
        return allAccessories.filter(acc => (acc.accessory_type || "Прочее") === accessoryTypeFilter);
    }, [allAccessories, accessoryTypeFilter]);
    return (_jsxs("div", { className: "space-y-2 pt-4 border-t", children: [_jsx(Label, { children: "\u041F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0435 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0431\u0443\u0434\u0443\u0442 \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0442\u044C\u0441\u044F \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u044D\u0442\u0438\u043C \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435\u043C." }), isLoadingAccessories ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u043F\u0438\u0441\u043A\u0430 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u043E\u0432..." })) : (_jsx(_Fragment, { children: accessoryTypes.length > 1 && (_jsx("div", { className: "pt-2", children: _jsxs(ToggleGroup, { type: "single", value: accessoryTypeFilter ?? "__all__", onValueChange: (value) => setAccessoryTypeFilter(value === "__all__" ? null : value), className: "flex flex-wrap gap-2", children: [_jsxs(ToggleGroupItem, { value: "__all__", size: "sm", children: [_jsx(List, { className: "h-4 w-4 mr-2" }), "\u0412\u0441\u0435"] }), accessoryTypes.map(type => (_jsx(ToggleGroupItem, { value: type, size: "sm", children: type }, type)))] }) })) })), !isLoadingAccessories && (_jsx(Controller, { control: control, name: "accessory_ids", render: ({ field }) => (_jsx("div", { className: "space-y-2 max-h-48 overflow-y-auto rounded-md border p-4 bg-slate-50", children: filteredAccessories.map((accessory) => (_jsxs("div", { className: "flex items-center justify-between hover:bg-slate-100 p-2 rounded", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: `accessory-${accessory.id}`, checked: field.value?.includes(accessory.id), onCheckedChange: (checked) => {
                                            const currentIds = field.value ?? [];
                                            const newIds = checked
                                                ? [...currentIds, accessory.id]
                                                : currentIds.filter(id => id !== accessory.id);
                                            field.onChange(newIds);
                                        } }), _jsx(Label, { htmlFor: `accessory-${accessory.id}`, className: "font-normal cursor-pointer", children: accessory.name })] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [accessory.price, " \u20BD"] })] }, accessory.id))) })) }))] }));
}
