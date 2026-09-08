import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Paperclip, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
export const AccessoriesSection = ({ equipment, isExpanded, isDisabled, onToggleExpand, onToggleAccessory, isAccessorySelected }) => {
    if (!equipment.accessories?.length)
        return null;
    return (_jsxs("div", { className: "mt-3 border-t pt-3", children: [_jsxs("button", { className: "w-full flex justify-between items-center text-sm font-medium text-gray-600 hover:text-sky-700 p-1 -m-1 rounded", onClick: onToggleExpand, "aria-expanded": isExpanded, children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Paperclip, { className: "w-4 h-4" }), "\u0410\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B (", equipment.accessories.length, ")"] }), _jsx(ChevronDown, { className: `w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}` })] }), isExpanded && (_jsx("div", { className: "mt-2 space-y-2 pl-1 animate-in fade-in-0 slide-in-from-top-2 duration-300", children: equipment.accessories.map(acc => (_jsxs("div", { className: "flex items-center justify-between p-1 rounded hover:bg-gray-50", children: [_jsxs(Label, { htmlFor: `acc-${equipment.id}-${acc.id}`, className: "flex items-center gap-2 text-xs font-normal cursor-pointer", children: [_jsx(Checkbox, { id: `acc-${equipment.id}-${acc.id}`, checked: isAccessorySelected(equipment.id, acc.id), onCheckedChange: () => onToggleAccessory(equipment.id, acc.id), disabled: isDisabled }), acc.name] }), _jsxs("span", { className: "text-xs text-gray-500", children: [acc.price, " \u20BD"] })] }, acc.id))) }))] }));
};
