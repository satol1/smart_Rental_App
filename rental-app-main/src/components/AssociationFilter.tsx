// src/components/AssociationFilter.tsx

import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFilterStore } from "@/store/filterStore";
import { getFilterToggleClass } from "@/components/ui/filter-toggle";
import { Tags, List } from "lucide-react";
import type { Association } from "@/types/association";

interface AssociationFilterProps {
    availableAssociations: Association[];
}

function AssociationFilter({ availableAssociations }: AssociationFilterProps) {
    const associationId = useFilterStore(state => state.associationId);
    const setAssociationId = useFilterStore(state => state.setAssociationId);

    // Если нет доступных ассоциаций, показываем только неактивную кнопку "Все подборки"
    if (availableAssociations.length === 0) {
        return (
            <ToggleGroup type="single" value="__all__" className="flex flex-wrap gap-2">
                <ToggleGroupItem 
                    value="__all__" 
                    className={getFilterToggleClass("green")} 
                    disabled
                >
                    <List />
                    Все подборки
                </ToggleGroupItem>
            </ToggleGroup>
        );
    }

    return (
        <ToggleGroup
            type="single"
            value={associationId?.toString() ?? "__all__"}
            onValueChange={(val: string) => setAssociationId(val === "__all__" ? null : Number(val))}
            className="flex flex-wrap gap-2"
        >
            <ToggleGroupItem value="__all__" className={getFilterToggleClass("green")}>
                <List />
                Все подборки
            </ToggleGroupItem>

            {availableAssociations.map((assoc) => (
                <ToggleGroupItem
                    key={assoc.id}
                    value={assoc.id.toString()}
                    className={getFilterToggleClass("green")}
                >
                    <Tags className="h-4 w-4" />
                    {assoc.name}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}

AssociationFilter.displayName = 'AssociationFilter';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AssociationFilter);
