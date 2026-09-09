//src/hooks/useImageUpload.ts

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";

// Префикс URL файлов, загруженных через POST /uploads/images
export const UPLOADED_IMAGE_PREFIX = "/api/uploads/images/";

interface UploadImageResponse {
    url: string;
}

// Загрузка изображения с компьютера на сервер (multipart/form-data, поле file)
export function useUploadImage() {
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            const response = await api.post<UploadImageResponse>("/uploads/images", formData);
            return response.data.url;
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при загрузке изображения"));
        },
    });
}

// Удаление ранее загруженного файла с сервера по имени файла
export function useDeleteImage() {
    return useMutation({
        mutationFn: async (filename: string) => {
            await api.delete(`/uploads/images/${filename}`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении изображения с сервера"));
        },
    });
}

// Извлекает имя файла из URL вида /api/uploads/images/<filename>,
// для внешних ссылок возвращает null
export function getUploadedFilename(url: string): string | null {
    if (!url.startsWith(UPLOADED_IMAGE_PREFIX)) return null;
    const filename = url.slice(UPLOADED_IMAGE_PREFIX.length);
    return filename || null;
}
