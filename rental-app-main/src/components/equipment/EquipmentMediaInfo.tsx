// src/components/equipment/EquipmentMediaInfo.tsx

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EquipmentImageGallery from "./EquipmentImageGallery";
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";

export default function EquipmentMediaInfo() {
    const { control, formState: { errors } } = useFormContext<EquipmentUpdateFormData>();
    return (
        <>
            <EquipmentImageGallery />

            <details className="rounded-md border p-3">
                <summary className="text-sm text-muted-foreground cursor-pointer select-none">
                    Или укажите ссылки
                </summary>
                <div className="space-y-4 mt-3">
                    <div>
                        <Label htmlFor="image_url">URL основного изображения</Label>
                        <Input
                            id="image_url"
                            {...control.register("image_url")}
                            placeholder="https://example.com/main_image.jpg"
                        />
                        {errors.image_url && <p className="text-xs text-red-600 mt-1">{errors.image_url.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="image_urls">URL дополнительных изображений (каждый с новой строки)</Label>
                        <Controller
                            name="image_urls"
                            control={control}
                            render={({ field }) => (
                                <Textarea
                                    id="image_urls"
                                    placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
                                    value={Array.isArray(field.value) ? field.value.join('\n') : ''}
                                    onChange={(e) => {
                                        const urls = e.target.value ? e.target.value.split('\n') : [];
                                        field.onChange(urls);
                                    }}
                                    rows={4}
                                />
                            )}
                        />
                        {errors.image_urls && <p className="text-xs text-red-600 mt-1">{errors.image_urls.message as string}</p>}
                    </div>
                </div>
            </details>
        </>
    );
}
