import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFilterStore } from "@/store/filterStore";
import { Label } from "@/components/ui/label";
function AvailableCheckbox() {
    const availableOnly = useFilterStore(state => state.availableOnly);
    const setAvailableOnly = useFilterStore(state => state.setAvailableOnly);
    return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: "available-only", checked: availableOnly, onCheckedChange: (checked) => setAvailableOnly(Boolean(checked)) }), _jsx(Label, { htmlFor: "available-only", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0435" })] }));
}
AvailableCheckbox.displayName = 'AvailableCheckbox';
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AvailableCheckbox);
