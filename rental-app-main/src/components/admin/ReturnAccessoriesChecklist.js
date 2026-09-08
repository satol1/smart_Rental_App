import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/ReturnAccessoriesChecklist.tsx
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
export default function ReturnAccessoriesChecklist({ rental, accessoriesByEquipment, checkedAccessories, handleToggleAccessory, totalAccessoriesCount, }) {
    if (totalAccessoriesCount === 0) {
        return null;
    }
    return (_jsxs("div", { className: "space-y-3 pt-3 border-t", children: [_jsx(Label, { className: "font-semibold", children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0432\u043E\u0437\u0432\u0440\u0430\u0442 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u043E\u0432:" }), _jsx("div", { className: "space-y-2 max-h-48 overflow-y-auto rounded-md border p-3 bg-slate-50", children: rental.equipment.map((eq) => (accessoriesByEquipment[eq.id] && (_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: eq.name }), _jsx("ul", { className: "pl-4 mt-1 space-y-1", children: accessoriesByEquipment[eq.id].map((acc) => {
                                const key = `${eq.id}-${acc.id}`;
                                return (_jsxs("li", { className: "flex items-center", children: [_jsx(Checkbox, { id: key, checked: checkedAccessories.has(key), onCheckedChange: () => handleToggleAccessory(eq.id, acc.id) }), _jsx(Label, { htmlFor: key, className: "ml-2 text-sm font-normal cursor-pointer", children: acc.name })] }, key));
                            }) })] }, eq.id)))) })] }));
}
