import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/reservation/AvailableAccessoriesDropdown.tsx
import { useState } from 'react';
import { Paperclip, ChevronDown, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
export const AvailableAccessoriesDropdown = ({ accessories, equipmentId, onToggleAccessory, disabled, hasTopBorder }) => {
    const [isExpanded, setExpanded] = useState(false);
    if (accessories.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: `pt-2 mt-2 ${hasTopBorder ? 'border-t border-dashed' : ''}`, children: [_jsxs("button", { className: "w-full flex justify-between items-center text-sm font-medium text-gray-600 hover:text-sky-700 p-1 -m-1 rounded", onClick: (e) => { e.stopPropagation(); setExpanded(p => !p); }, "aria-expanded": isExpanded, disabled: disabled, children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Paperclip, { className: "w-4 h-4" }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B (", accessories.length, ")"] }), _jsx(ChevronDown, { className: `w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}` })] }), isExpanded && (_jsx("div", { className: "mt-2 space-y-1 pl-1 animate-in fade-in-0 slide-in-from-top-2 duration-300", children: accessories.map(acc => (_jsxs("div", { className: "flex items-center justify-between p-1 rounded hover:bg-gray-50", children: [_jsxs("span", { className: "text-xs font-normal", children: [acc.name, " (", acc.price, " \u20BD)"] }), _jsxs(Button, { size: "sm", variant: "ghost", className: "h-6 px-2 text-xs", onClick: () => onToggleAccessory(equipmentId, acc.id), disabled: disabled, children: [_jsx(PlusCircle, { className: "w-3.5 h-3.5 mr-1" }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"] })] }, acc.id))) }))] }));
};
