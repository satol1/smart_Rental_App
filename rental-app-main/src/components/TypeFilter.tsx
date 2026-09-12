// src/components/TypeFilter.tsx
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFilterStore } from "@/store/filterStore"
import { getFilterToggleClass } from "@/components/ui/filter-toggle"
import { List } from "lucide-react"
import { getEquipmentTypeIcon } from "@/lib/equipmentTypeIcons"

// Иконка типа каталога: матчинг по подстрокам с fallback Package (см. lib/equipmentTypeIcons)
const getIconForType = (type: string): React.ReactElement | null => {
    const Icon = getEquipmentTypeIcon(type);
    return Icon ? <Icon /> : null;
}

interface TypeFilterProps {
    availableTypes: string[]
}

function TypeFilter({ availableTypes }: TypeFilterProps) {
    const type = useFilterStore(state => state.type);
    const setType = useFilterStore(state => state.setType);

    // Если нет доступных типов, показываем только неактивную кнопку "Все типы"
    if (availableTypes.length === 0) {
        return (
            <ToggleGroup type="single" value="__all__" className="flex flex-wrap gap-2">
                <ToggleGroupItem 
                    value="__all__" 
                    className={getFilterToggleClass()} 
                    disabled
                >
                    <List />
                    Все типы
                </ToggleGroupItem>
            </ToggleGroup>
        );
    }

    return (
        <ToggleGroup
            type="single"
            value={type ?? "__all__"}
            onValueChange={(val: string) => setType(val === "__all__" ? null : val)}
            className="flex flex-wrap gap-2"
        >
            <ToggleGroupItem
                value="__all__"
                className={getFilterToggleClass()}
            >
                <List />
                Все
            </ToggleGroupItem>

            {availableTypes.map((t) => (
                <ToggleGroupItem
                    key={t}
                    value={t}
                    className={getFilterToggleClass()}
                >
                    {getIconForType(t)}
                    {t}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    )
}

TypeFilter.displayName = 'TypeFilter';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(TypeFilter);