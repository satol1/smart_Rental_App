import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/BrandFilter.tsx
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFilterStore } from "@/store/filterStore";
import { getFilterToggleClass } from "@/components/ui/filter-toggle";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";
function BrandFilter({ availableBrands }) {
    const brandSystemId = useFilterStore(state => state.brandSystemId);
    const setBrandSystemId = useFilterStore(state => state.setBrandSystemId);
    // Фиксированные цвета для определенных брендов
    const fixedBrandColors = {
        'Canon': 'red',
        'Nikon': 'yellow',
        'Sony': 'orange',
        'Fujifilm': 'black',
        'Aputure': 'blue',
        'DJI': 'gray'
    };
    // Автоматические цвета для остальных брендов (циклически)
    const autoBrandColors = ['sky', 'green', 'amber', 'purple', 'rose', 'indigo', 'emerald'];
    const getBrandColor = (brandName, index) => {
        // Если у бренда есть фиксированный цвет, используем его
        if (fixedBrandColors[brandName]) {
            return fixedBrandColors[brandName];
        }
        // Иначе назначаем автоматический цвет
        return autoBrandColors[index % autoBrandColors.length];
    };
    // Если нет доступных брендов, показываем только неактивную кнопку "Все бренды"
    if (availableBrands.length === 0) {
        return (_jsx(ToggleGroup, { type: "single", value: "__all__", className: "flex flex-wrap gap-2", children: _jsxs(ToggleGroupItem, { value: "__all__", className: cn(getFilterToggleClass("sky"), "rounded-full"), disabled: true, children: [_jsx(List, {}), "\u0412\u0441\u0435 \u0431\u0440\u0435\u043D\u0434\u044B"] }) }));
    }
    return (_jsxs(ToggleGroup, { type: "single", value: brandSystemId?.toString() ?? "__all__", onValueChange: (val) => setBrandSystemId(val === "__all__" ? null : Number(val)), className: "flex flex-wrap gap-2", children: [_jsxs(ToggleGroupItem, { value: "__all__", className: cn(getFilterToggleClass("sky"), "rounded-full"), children: [_jsx(List, {}), "\u0412\u0441\u0435 \u0431\u0440\u0435\u043D\u0434\u044B"] }), availableBrands.map((brand, index) => (_jsx(ToggleGroupItem, { value: brand.id.toString(), size: "sm", className: cn(getFilterToggleClass(getBrandColor(brand.name, index)), "rounded-full"), children: brand.name }, brand.id)))] }));
}
BrandFilter.displayName = 'BrandFilter';
// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(BrandFilter);
