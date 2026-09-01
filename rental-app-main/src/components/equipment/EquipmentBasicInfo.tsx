// src/components/equipment/EquipmentBasicInfo.tsx

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatableSelect } from "@/components/ui/CreatableSelect";
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";

type Props = {
    equipmentTypes: string[];
    equipmentBrands: string[];
};

export default function EquipmentBasicInfo({ equipmentTypes, equipmentBrands }: Props) {
    const { control, formState: { errors } } = useFormContext<EquipmentUpdateFormData>();
    return (
        <>
            <div>
                <Label htmlFor="name">Название</Label>
                <Input id="name" {...control.register("name")} />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="equipment_type">Тип оборудования</Label>
                    <Controller
                        name="equipment_type"
                        control={control}
                        render={({ field }) => {
                            // Добавляем текущее значение в опции, если его там нет
                            const optionsWithCurrent = field.value && field.value.trim() !== "" && !equipmentTypes.includes(field.value) 
                                ? [...equipmentTypes, field.value]
                                : equipmentTypes;
                            
                            return (
                                <CreatableSelect
                                    value={field.value}
                                    onChange={field.onChange}
                                    options={optionsWithCurrent}
                                    placeholder="Выберите или создайте тип"
                                    dialogTitle="Новый тип оборудования"
                                    dialogDescription="Введите название для нового типа."
                                    dialogLabel="Название"
                                />
                            );
                        }}
                    />
                    {errors.equipment_type && <p className="text-xs text-red-600 mt-1">{errors.equipment_type.message}</p>}
                </div>
                <div>
                    <Label htmlFor="brand">Бренд</Label>
                    <Controller
                        name="brand"
                        control={control}
                        render={({ field }) => {
                            // Добавляем текущее значение в опции, если его там нет
                            const optionsWithCurrent = field.value && field.value.trim() !== "" && !equipmentBrands.includes(field.value) 
                                ? [...equipmentBrands, field.value]
                                : equipmentBrands;
                            
                            return (
                                <CreatableSelect
                                    value={field.value}
                                    onChange={field.onChange}
                                    options={optionsWithCurrent}
                                    placeholder="Выберите или создайте бренд"
                                    dialogTitle="Новый бренд"
                                    dialogDescription="Введите название для нового бренда."
                                    dialogLabel="Название"
                                />
                            );
                        }}
                    />
                    {errors.brand && <p className="text-xs text-red-600 mt-1">{errors.brand.message}</p>}
                </div>
            </div>

            <div>
                <Label htmlFor="short_description">Краткое описание (для карточки)</Label>
                <Input 
                    id="short_description" 
                    {...control.register("short_description")} 
                    placeholder="Например: Профессиональная беззеркальная камера..." 
                />
                {errors.short_description && <p className="text-xs text-red-600 mt-1">{errors.short_description.message}</p>}
            </div>

            <div>
                <Label htmlFor="serial_number">Серийный номер</Label>
                <Input id="serial_number" {...control.register("serial_number")} />
                {errors.serial_number && <p className="text-xs text-red-600 mt-1">{errors.serial_number.message}</p>}
            </div>
        </>
    );
}
