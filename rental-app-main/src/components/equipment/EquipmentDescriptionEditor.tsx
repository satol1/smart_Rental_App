// src/components/equipment/EquipmentDescriptionEditor.tsx

import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";

export default function EquipmentDescriptionEditor() {
    const { control, formState: { errors } } = useFormContext<EquipmentUpdateFormData>();
    return (
        <div>
            <Label htmlFor="description">Описание (Markdown)</Label>
            <Controller
                name="description"
                control={control}
                render={({ field }) => (
                    <div data-color-mode="light">
                        <MDEditor
                            value={field.value ?? ""}
                            onChange={(val) => field.onChange(val ?? "")}
                            previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
                            height={250}
                        />
                    </div>
                )}
            />
            {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
        </div>
    );
}
