import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/AssociationFilter.tsx
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFilterStore } from "@/store/filterStore";
import { getFilterToggleClass } from "@/components/ui/filter-toggle";
import { Tags, List } from "lucide-react";
function AssociationFilter({ availableAssociations }) {
    const associationId = useFilterStore(state => state.associationId);
    const setAssociationId = useFilterStore(state => state.setAssociationId);
    // Если нет доступных ассоциаций, показываем только неактивную кнопку "Все подборки"
    if (availableAssociations.length === 0) {
        return (_jsx(ToggleGroup, { type: "single", value: "__all__", className: "flex flex-wrap gap-2", children: _jsxs(ToggleGroupItem, { value: "__all__", className: getFilterToggleClass("green"), disabled: true, children: [_jsx(List, {}), "\u0412\u0441\u0435 \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0438"] }) }));
    }
    return (_jsxs(ToggleGroup, { type: "single", value: associationId?.toString() ?? "__all__", onValueChange: (val) => setAssociationId(val === "__all__" ? null : Number(val)), className: "flex flex-wrap gap-2", children: [_jsxs(ToggleGroupItem, { value: "__all__", className: getFilterToggleClass("green"), children: [_jsx(List, {}), "\u0412\u0441\u0435 \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0438"] }), availableAssociations.map((assoc) => (_jsxs(ToggleGroupItem, { value: assoc.id.toString(), className: getFilterToggleClass("green"), children: [_jsx(Tags, { className: "h-4 w-4" }), assoc.name] }, assoc.id)))] }));
}
AssociationFilter.displayName = 'AssociationFilter';
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AssociationFilter);
