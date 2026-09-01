// src/components/TypeFilter.tsx
import React, { type ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useFilterStore } from "@/store/filterStore"
import { getFilterToggleClass } from "@/components/ui/filter-toggle"
import {
    Camera,
    Aperture,
    Lightbulb,
    Mic,
    Video,
    Grip,
    Headphones,
    Laptop,
    Package,
    List,
} from "lucide-react"

// Вспомогательная функция для сопоставления типа оборудования с иконкой
const getIconForType = (type: string): ReactNode => {
    const iconMap: Record<string, ReactNode> = {
        "Фотокамера": <Camera />,
        "Объектив": <Aperture />,
        "Свет": <Lightbulb />,
        "Микрофон": <Mic />,
        "Экшн камера": <Video />,
        "Штативы": <Grip />,
        "Аудиооборудование": <Headphones />,
        "Компьютерная техника": <Laptop />,
        "Прочее": <Package />,
    }
    // Возвращаем соответствующую иконку или null, если совпадения не найдены
    return iconMap[type] || null
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