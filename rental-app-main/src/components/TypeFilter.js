import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/TypeFilter.tsx
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFilterStore } from "@/store/filterStore";
import { getFilterToggleClass } from "@/components/ui/filter-toggle";
import { Camera, Aperture, Lightbulb, Mic, Video, Grip, Headphones, Laptop, Package, List, } from "lucide-react";
// Вспомогательная функция для сопоставления типа оборудования с иконкой
const getIconForType = (type) => {
    const iconMap = {
        "Фотокамера": _jsx(Camera, {}),
        "Объектив": _jsx(Aperture, {}),
        "Свет": _jsx(Lightbulb, {}),
        "Микрофон": _jsx(Mic, {}),
        "Экшн камера": _jsx(Video, {}),
        "Штативы": _jsx(Grip, {}),
        "Аудиооборудование": _jsx(Headphones, {}),
        "Компьютерная техника": _jsx(Laptop, {}),
        "Прочее": _jsx(Package, {}),
    };
    // Возвращаем соответствующую иконку или null, если совпадения не найдены
    return iconMap[type] || null;
};
function TypeFilter({ availableTypes }) {
    const type = useFilterStore(state => state.type);
    const setType = useFilterStore(state => state.setType);
    // Если нет доступных типов, показываем только неактивную кнопку "Все типы"
    if (availableTypes.length === 0) {
        return (_jsx(ToggleGroup, { type: "single", value: "__all__", className: "flex flex-wrap gap-2", children: _jsxs(ToggleGroupItem, { value: "__all__", className: getFilterToggleClass(), disabled: true, children: [_jsx(List, {}), "\u0412\u0441\u0435 \u0442\u0438\u043F\u044B"] }) }));
    }
    return (_jsxs(ToggleGroup, { type: "single", value: type ?? "__all__", onValueChange: (val) => setType(val === "__all__" ? null : val), className: "flex flex-wrap gap-2", children: [_jsxs(ToggleGroupItem, { value: "__all__", className: getFilterToggleClass(), children: [_jsx(List, {}), "\u0412\u0441\u0435"] }), availableTypes.map((t) => (_jsxs(ToggleGroupItem, { value: t, className: getFilterToggleClass(), children: [getIconForType(t), t] }, t)))] }));
}
TypeFilter.displayName = 'TypeFilter';
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(TypeFilter);
