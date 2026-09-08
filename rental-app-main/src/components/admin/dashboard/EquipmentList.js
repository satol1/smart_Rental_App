import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/dashboard/EquipmentList.tsx
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
export default function EquipmentList({ equipmentList, maxVisible = 3 }) {
    const [isExpanded, setIsExpanded] = useState(false);
    // Показываем только первые maxVisible элементов оборудования
    const visibleEquipment = isExpanded ? equipmentList : equipmentList.slice(0, maxVisible);
    const hasMoreEquipment = equipmentList.length > maxVisible;
    if (equipmentList.length === 0) {
        return (_jsxs("div", { className: "mt-2 pt-2 border-t", children: [_jsx("p", { className: "text-xs font-semibold mb-1", children: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435:" }), _jsx("p", { className: "text-xs text-gray-500", children: "\u041D\u0435\u0442 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" })] }));
    }
    return (_jsxs("div", { className: "mt-2 pt-2 border-t", children: [_jsx("p", { className: "text-xs font-semibold mb-1", children: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435:" }), _jsx("ul", { className: "list-disc list-inside text-xs space-y-0.5", children: visibleEquipment.map((eq, index) => (_jsx("li", { children: eq }, index))) }), hasMoreEquipment && (_jsx("button", { onClick: () => setIsExpanded(!isExpanded), className: "text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1", children: isExpanded ? (_jsxs(_Fragment, { children: [_jsx(ChevronUp, { className: "w-3 h-3" }), "\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C"] })) : (_jsxs(_Fragment, { children: [_jsx(ChevronDown, { className: "w-3 h-3" }), "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0435 ", equipmentList.length - maxVisible] })) }))] }));
}
