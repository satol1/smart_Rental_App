// src/components/equipment/EquipmentPricingInfo.tsx

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EQUIPMENT_CONDITIONS } from "@/constants/equipmentConstants";
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";

export default function EquipmentPricingInfo() {
    const { control, formState: { errors } } = useFormContext<EquipmentUpdateFormData>();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="condition">Состояние *</Label>
                <Controller
                    name="condition"
                    control={control}
                    render={({ field }) => (
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                        >
                            <SelectTrigger id="condition">
                                <SelectValue placeholder="Выберите состояние" />
                            </SelectTrigger>
                            <SelectContent>
                                {EQUIPMENT_CONDITIONS.map((condition) => (
                                    <SelectItem key={condition} value={condition}>
                                        {condition}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.condition && (
                    <p className="text-xs text-destructive mt-1">
                        {errors.condition.message}
                    </p>
                )}
            </div>
            <div>
                <Label htmlFor="daily_rate">Цена за день (₽)</Label>
                <Controller
                    name="daily_rate"
                    control={control}
                    render={({ field }) => (
                        <Input
                            {...field}
                            id="daily_rate"
                            type="number"
                            value={field.value ?? ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? undefined : parseFloat(val));
                            }}
                            step="0.01"
                            placeholder="0.00"
                        />
                    )}
                />
                {errors.daily_rate && <p className="text-xs text-destructive mt-1">{errors.daily_rate.message}</p>}
            </div>
        </div>
    );
}
