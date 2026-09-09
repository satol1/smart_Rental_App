// src/components/equipment/EquipmentImageGallery.tsx

import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useUploadImage, useDeleteImage, getUploadedFilename } from "@/hooks/useImageUpload";
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

export default function EquipmentImageGallery() {
    const { watch, getValues, setValue } = useFormContext<EquipmentUpdateFormData>();
    const uploadImage = useUploadImage();
    const deleteImage = useDeleteImage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const mainUrl = watch("image_url");
    const extraUrls = watch("image_urls") ?? [];
    const photos = [mainUrl, ...extraUrls].filter((url): url is string => Boolean(url));
    const isUploading = uploadImage.isPending;

    const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        if (files.length === 0) return;

        const errors: string[] = [];
        const validFiles = files.filter((file) => {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                errors.push(`«${file.name}»: неподдерживаемый формат (только JPEG, PNG, WebP)`);
                return false;
            }
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`«${file.name}»: файл больше ${MAX_FILE_SIZE_MB} МБ`);
                return false;
            }
            return true;
        });
        setValidationErrors(errors);

        // Загружаем последовательно, чтобы сохранить порядок выбранных файлов
        for (const file of validFiles) {
            try {
                const url = await uploadImage.mutateAsync(file);
                if (!getValues("image_url")) {
                    setValue("image_url", url, { shouldDirty: true });
                } else {
                    setValue("image_urls", [...(getValues("image_urls") ?? []), url], { shouldDirty: true });
                }
            } catch {
                // Ошибка уже показана через toast в мутации, останавливаем очередь
                break;
            }
        }
    };

    const handleSetMain = (url: string) => {
        if (url === mainUrl) return;
        const rest = (getValues("image_urls") ?? []).filter((u) => u !== url);
        if (mainUrl) rest.unshift(mainUrl);
        setValue("image_url", url, { shouldDirty: true });
        setValue("image_urls", rest, { shouldDirty: true });
    };

    const handleRemove = (url: string) => {
        if (url === getValues("image_url")) {
            setValue("image_url", null, { shouldDirty: true });
        } else {
            setValue("image_urls", (getValues("image_urls") ?? []).filter((u) => u !== url), { shouldDirty: true });
        }
        // Загруженный на сервер файл удаляем и с сервера, внешнюю ссылку — только из формы
        const filename = getUploadedFilename(url);
        if (filename) {
            deleteImage.mutate(filename);
        }
    };

    return (
        <div className="space-y-3">
            <Label>Фотографии оборудования</Label>

            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                multiple
                className="hidden"
                onChange={handleFilesSelected}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
            >
                {isUploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                {isUploading ? "Загрузка..." : "Загрузить фото"}
            </Button>

            {validationErrors.length > 0 && (
                <div className="space-y-1">
                    {validationErrors.map((message) => (
                        <p key={message} className="text-xs text-red-600">{message}</p>
                    ))}
                </div>
            )}

            {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((url) => {
                        const isMain = url === mainUrl;
                        return (
                            <div key={url} className="relative rounded-md border overflow-hidden">
                                <img
                                    src={url}
                                    alt="Фото оборудования"
                                    className="h-28 w-full object-cover"
                                />
                                {isMain && (
                                    <Badge variant="secondary" className="absolute top-1 left-1">
                                        Главное
                                    </Badge>
                                )}
                                <div className="flex gap-1 p-1">
                                    {!isMain && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 text-xs"
                                            disabled={isUploading}
                                            onClick={() => handleSetMain(url)}
                                        >
                                            <Star />
                                            Сделать главным
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="flex-1 text-xs text-red-600"
                                        disabled={isUploading}
                                        onClick={() => handleRemove(url)}
                                    >
                                        <Trash2 />
                                        Удалить
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
