// src/components/equipment/EquipmentAccessoriesSelector.tsx

import { useState, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { List } from "lucide-react";
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";
import type { Accessory } from "@/types/accessory";

type Props = {
    allAccessories: Accessory[];
    isLoadingAccessories: boolean;
};

export default function EquipmentAccessoriesSelector({ 
    allAccessories, 
    isLoadingAccessories 
}: Props) {
    const { control, formState: { errors } } = useFormContext<EquipmentUpdateFormData>();
    // Состояние для управления фильтром по типу аксессуаров
    const [accessoryTypeFilter, setAccessoryTypeFilter] = useState<string | null>(null);

    // Получаем уникальные типы аксессуаров
    const accessoryTypes = useMemo(() => {
        if (!allAccessories) return [];
        const types = new Set(allAccessories.map(acc => acc.accessory_type || "Прочее"));
        return Array.from(types).sort();
    }, [allAccessories]);

    // Фильтруем аксессуары по выбранному типу
    const filteredAccessories = useMemo(() => {
        if (!accessoryTypeFilter) {
            return allAccessories; // Если фильтр не выбран, показываем все
        }
        return allAccessories.filter(acc => (acc.accessory_type || "Прочее") === accessoryTypeFilter);
    }, [allAccessories, accessoryTypeFilter]);

    return (
        <div className="space-y-2 pt-4 border-t">
            <Label>Привязанные аксессуары</Label>
            <p className="text-sm text-muted-foreground">
                Выберите аксессуары, которые будут предлагаться вместе с этим оборудованием.
            </p>
            {isLoadingAccessories ? (
                <p className="text-sm text-muted-foreground">Загрузка списка аксессуаров...</p>
            ) : (
                <>
                    {/* Блок кнопок для быстрой фильтрации по типу аксессуаров */}
                    {accessoryTypes.length > 1 && (
                        <div className="pt-2">
                            <ToggleGroup
                                type="single"
                                value={accessoryTypeFilter ?? "__all__"}
                                onValueChange={(value) => setAccessoryTypeFilter(value === "__all__" ? null : value)}
                                className="flex flex-wrap gap-2"
                            >
                                <ToggleGroupItem value="__all__" size="sm">
                                    <List className="h-4 w-4 mr-2" />
                                    Все
                                </ToggleGroupItem>
                                {accessoryTypes.map(type => (
                                    <ToggleGroupItem key={type} value={type} size="sm">
                                        {type}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                    )}
                </>
            )}
            {!isLoadingAccessories && (
                <Controller
                    control={control}
                    name="accessory_ids"
                    render={({ field }) => (
                        <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-4 bg-slate-50">
                            {filteredAccessories.map((accessory: Accessory) => (
                                <div key={accessory.id} className="flex items-center justify-between hover:bg-slate-100 p-2 rounded">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id={`accessory-${accessory.id}`}
                                            checked={field.value?.includes(accessory.id)}
                                            onCheckedChange={(checked) => {
                                                const currentIds = field.value ?? [];
                                                const newIds = checked
                                                    ? [...currentIds, accessory.id]
                                                    : currentIds.filter(id => id !== accessory.id);
                                                field.onChange(newIds);
                                            }}
                                        />
                                        <Label htmlFor={`accessory-${accessory.id}`} className="font-normal cursor-pointer">
                                            {accessory.name}
                                        </Label>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{accessory.price} ₽</span>
                                </div>
                            ))}
                        </div>
                    )}
                />
            )}
        </div>
    );
}
