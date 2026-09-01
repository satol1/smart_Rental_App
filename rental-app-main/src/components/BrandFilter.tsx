// src/components/BrandFilter.tsx
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFilterStore } from "@/store/filterStore"
import { getFilterToggleClass } from "@/components/ui/filter-toggle"
import { List } from "lucide-react"
import { cn } from "@/lib/utils"
interface BrandFilterProps {
    availableBrands: Array<{id: number, name: string}>;
}

function BrandFilter({ availableBrands }: BrandFilterProps) {
    const brandSystemId = useFilterStore(state => state.brandSystemId);
    const setBrandSystemId = useFilterStore(state => state.setBrandSystemId);

    // Фиксированные цвета для определенных брендов
    const fixedBrandColors: Record<string, string> = {
        'Canon': 'red',
        'Nikon': 'yellow', 
        'Sony': 'orange',
        'Fujifilm': 'black',
        'Aputure': 'blue',
        'DJI': 'gray'
    };

    // Автоматические цвета для остальных брендов (циклически)
    const autoBrandColors = ['sky', 'green', 'amber', 'purple', 'rose', 'indigo', 'emerald'] as const;
    
    const getBrandColor = (brandName: string, index: number): string => {
        // Если у бренда есть фиксированный цвет, используем его
        if (fixedBrandColors[brandName]) {
            return fixedBrandColors[brandName];
        }
        // Иначе назначаем автоматический цвет
        return autoBrandColors[index % autoBrandColors.length];
    };

    // Если нет доступных брендов, показываем только неактивную кнопку "Все бренды"
    if (availableBrands.length === 0) {
        return (
            <ToggleGroup type="single" value="__all__" className="flex flex-wrap gap-2">
                <ToggleGroupItem 
                    value="__all__" 
                    className={cn(getFilterToggleClass("sky"), "rounded-full")} 
                    disabled
                >
                    <List />
                    Все бренды
                </ToggleGroupItem>
            </ToggleGroup>
        );
    }

    return (
        <ToggleGroup
            type="single"
            value={brandSystemId?.toString() ?? "__all__"}
            onValueChange={(val: string) => setBrandSystemId(val === "__all__" ? null : Number(val))}
            className="flex flex-wrap gap-2"
        >
            <ToggleGroupItem
                value="__all__"
                className={cn(getFilterToggleClass("sky"), "rounded-full")}
            >
                <List />
                Все бренды
            </ToggleGroupItem>

            {availableBrands.map((brand, index) => (
                <ToggleGroupItem
                    key={brand.id}
                    value={brand.id.toString()}
                    size="sm"
                    className={cn(
                        getFilterToggleClass(getBrandColor(brand.name, index)),
                        "rounded-full"
                    )}
                >
                    {brand.name}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}

BrandFilter.displayName = 'BrandFilter';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(BrandFilter);
