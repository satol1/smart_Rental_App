import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useFilterStore } from "@/store/filterStore";
import { Label } from "@/components/ui/label";
function GroupSimilarCheckbox() {
    const groupSimilar = useFilterStore(state => state.groupSimilar);
    const setGroupSimilar = useFilterStore(state => state.setGroupSimilar);
    return (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Checkbox, { id: "group-similar", checked: groupSimilar, onCheckedChange: (checked) => setGroupSimilar(Boolean(checked)) }), _jsx(Label, { htmlFor: "group-similar", children: "\u0413\u0440\u0443\u043F\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0435" })] }));
}
GroupSimilarCheckbox.displayName = 'GroupSimilarCheckbox';
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(GroupSimilarCheckbox);
