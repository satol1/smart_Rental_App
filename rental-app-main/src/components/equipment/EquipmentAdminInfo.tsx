// src/components/equipment/EquipmentAdminInfo.tsx

import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";

export default function EquipmentAdminInfo() {
    const { control, formState: { errors } } = useFormContext<EquipmentUpdateFormData>();
    return (
        <>
            <div>
                <Label htmlFor="notes">Заметки (видно только менеджерам/админам)</Label>
                <Textarea id="notes" {...control.register("notes")} rows={3} />
                {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>}
            </div>

            <div>
                <Label htmlFor="last_maintenance">Дата последнего ТО (видно только менеджерам/админам)</Label>
                <Input
                    id="last_maintenance"
                    type="date"
                    {...control.register("last_maintenance")}
                />
                {errors.last_maintenance && <p className="text-xs text-red-600 mt-1">{errors.last_maintenance.message}</p>}
            </div>
        </>
    );
}
