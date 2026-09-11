// src/components/equipment/EquipmentImageGallery.tsx

import { useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ImagePlus, Loader2, Star, Trash2, UploadCloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useUploadImage, useDeleteImage, getUploadedFilename } from "@/hooks/useImageUpload";
import { useCurrentUser } from "@/hooks/useProfile";
import type { EquipmentUpdateExtendedSchema as EquipmentUpdateFormData } from "@/lib/validationSchemas";

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

export default function EquipmentImageGallery() {
    const { watch, getValues, setValue } = useFormContext<EquipmentUpdateFormData>();
    const { data: currentUser } = useCurrentUser();
    const uploadImage = useUploadImage();
    const deleteImage = useDeleteImage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const canUpload = currentUser?.role === "admin" || currentUser?.role === "manager";

    const mainUrl = watch("image_url");
    const extraUrls = watch("image_urls") ?? [];
    // Исключаем дубликаты и пустые значения
    const rawPhotos = [mainUrl, ...extraUrls].filter((url): url is string => Boolean(url));
    const photos = Array.from(new Set(rawPhotos));
    const isUploading = uploadImage.isPending;

    const processFiles = async (files: File[]) => {
        if (!canUpload || files.length === 0) return;

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

        // Загружаем последовательно на сервер проекта, чтобы сохранить порядок
        for (const file of validFiles) {
            try {
                const url = await uploadImage.mutateAsync(file);
                if (!getValues("image_url")) {
                    setValue("image_url", url, { shouldDirty: true });
                } else {
                    const currentExtras = getValues("image_urls") ?? [];
                    setValue("image_urls", [...currentExtras, url], { shouldDirty: true });
                }
            } catch {
                // Ошибка выводится через toast в useImageUpload
                break;
            }
        }
    };

    const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        await processFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (canUpload && !isUploading) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (!canUpload || isUploading) return;
        const files = Array.from(e.dataTransfer.files ?? []);
        await processFiles(files);
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
            const rest = (getValues("image_urls") ?? []).filter((u) => u !== url);
            if (rest.length > 0) {
                const [newMain, ...remaining] = rest;
                setValue("image_url", newMain, { shouldDirty: true });
                setValue("image_urls", remaining, { shouldDirty: true });
            } else {
                setValue("image_url", null, { shouldDirty: true });
            }
        } else {
            setValue("image_urls", (getValues("image_urls") ?? []).filter((u) => u !== url), { shouldDirty: true });
        }
        // Загруженный на сервер файл удаляем и из папки проекта, внешнюю ссылку — только из формы
        const filename = getUploadedFilename(url);
        if (filename) {
            deleteImage.mutate(filename);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Фотографии оборудования</Label>
                <span className="text-xs text-muted-foreground">
                    JPEG, PNG, WebP до {MAX_FILE_SIZE_MB} МБ
                </span>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTR}
                multiple
                className="hidden"
                onChange={handleFilesSelected}
            />

            {canUpload ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                >
                    <div className="flex flex-col items-center justify-center gap-2">
                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                        <div className="text-xs text-muted-foreground">
                            Перетащите файлы сюда или выберите с диска
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-1"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Загрузка в проект...
                                </>
                            ) : (
                                <>
                                    <ImagePlus className="w-4 h-4 mr-2" />
                                    Загрузить фото с компьютера
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 p-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Добавлять фотографии к карточкам могут только администраторы и менеджеры проекта.</span>
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="space-y-1">
                    {validationErrors.map((message) => (
                        <p key={message} className="text-xs text-red-600">{message}</p>
                    ))}
                </div>
            )}

            {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {photos.map((url) => {
                        const isMain = url === mainUrl;
                        return (
                            <div key={url} className="relative rounded-md border overflow-hidden group bg-card">
                                <img
                                    src={url}
                                    alt="Фото оборудования"
                                    className="h-28 w-full object-cover"
                                />
                                {isMain && (
                                    <Badge variant="secondary" className="absolute top-1 left-1 shadow-sm text-xs">
                                        Главное
                                    </Badge>
                                )}
                                {canUpload && (
                                    <div className="flex gap-1 p-1 bg-background/95 border-t">
                                        {!isMain && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="flex-1 text-xs h-7 px-1"
                                                disabled={isUploading}
                                                onClick={() => handleSetMain(url)}
                                            >
                                                <Star className="w-3 h-3 mr-1" />
                                                Главное
                                            </Button>
                                        )}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-1"
                                            disabled={isUploading}
                                            onClick={() => handleRemove(url)}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Удалить
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
