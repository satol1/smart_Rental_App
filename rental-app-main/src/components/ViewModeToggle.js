import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ViewModeToggle.tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List } from "lucide-react";
// Импортируем обновленный стор
import { useViewModeStore } from "@/store/viewModeStore";
export default function ViewModeToggle() {
    // Используем новые методы из стора
    const { viewMode, setViewMode } = useViewModeStore();
    return (_jsxs(ToggleGroup, { type: "single", value: viewMode, onValueChange: (value) => {
            // Проверяем, что значение не пустое, прежде чем обновлять стор
            if (value)
                setViewMode(value);
        }, className: "flex items-center", "aria-label": "\u041F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u044C \u0432\u0438\u0434\u0430 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A", children: [_jsx(ToggleGroupItem, { value: "default", "aria-label": "\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u043D\u044B\u0439 \u0432\u0438\u0434", className: "p-2 h-9 w-9", children: _jsx(LayoutGrid, { className: "h-4 w-4" }) }), _jsx(ToggleGroupItem, { value: "compact", "aria-label": "\u041A\u043E\u043C\u043F\u0430\u043A\u0442\u043D\u044B\u0439 \u0432\u0438\u0434", className: "p-2 h-9 w-9", children: _jsx(List, { className: "h-4 w-4" }) })] }));
}
