// src/hooks/useAdminAccessories.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import type { Accessory, AccessoryListResponse } from "@/types/accessory";
import { AccessoryService } from "@/core/services";

// Типы для создания и обновления
type AccessoryPayload = {
    name: string;
    accessory_type?: string;
    price?: number;
    description?: string;
};

// +++ НАЧАЛО ИЗМЕНЕНИЙ +++
// Добавляем значения по умолчанию для страницы и размера страницы
export function useAccessories(page: number = 1, pageSize: number = 20) {
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++
    const skip = (page - 1) * pageSize;

    return useQuery<AccessoryListResponse, Error, Accessory[]>({
        queryKey: ["accessories", page, pageSize],
        queryFn: async () => {
            return await AccessoryService.getAllAccessories(skip, pageSize);
        },
        select: (data) => data.items,
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

// Хук для получения полного ответа с метаданными пагинации
export function useAccessoriesWithPagination(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    return useQuery<AccessoryListResponse>({
        queryKey: ["accessories", page, pageSize],
        queryFn: async () => {
            return await AccessoryService.getAllAccessories(skip, pageSize);
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

// Создание нового аксессуара
export function useCreateAccessory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: AccessoryPayload) => api.post<Accessory>("/accessories/", data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["accessories"] });
            toast.success("Аксессуар успешно создан");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при создании аксессуара"));
        },
    });
}

// Обновление аксессуара
export function useUpdateAccessory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number, data: AccessoryPayload }) =>
            api.put<Accessory>(`/accessories/${id}`, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["accessories"] });
            toast.success("Аксессуар успешно обновлен");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при обновлении аксессуара"));
        },
    });
}

// Получение аксессуара по ID
export function useAccessory(id: number | null) {
    return useQuery<Accessory>({
        queryKey: ["accessory", id],
        queryFn: async () => {
            if (!id) throw new Error("ID аксессуара не указан");
            const response = await api.get<Accessory>(`/accessories/${id}`);
            return response.data;
        },
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

// Удаление аксессуара
export function useDeleteAccessory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.delete(`/accessories/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["accessories"] });
            toast.success("Аксессуар удален");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении аксессуара"));
        },
    });
}