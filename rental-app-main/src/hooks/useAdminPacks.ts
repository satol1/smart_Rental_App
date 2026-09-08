// src/hooks/useAdminPacks.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import type { Pack, PackCreateData, PackUpdateData } from "@/types/pack";

// Получение списка всех пачек
export function useAdminPacks() {
    return useQuery({
        queryKey: ["admin", "packs"],
        queryFn: async () => {
            const response = await api.get<Pack[]>("/admin/packs/");
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

// Создание новой пачки
export function useCreatePack() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (packData: PackCreateData) => {
            const response = await api.post<Pack>("/admin/packs/", packData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "packs"] });
            toast.success("Пачка успешно создана");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при создании пачки"));
        },
    });
}

// Обновление пачки
export function useUpdatePack() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: PackUpdateData }) => {
            const response = await api.put<Pack>(`/admin/packs/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "packs"] });
            toast.success("Пачка успешно обновлена");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при обновлении пачки"));
        },
    });
}

// Удаление пачки
export function useDeletePack() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (packId: number) => {
            const response = await api.delete(`/admin/packs/${packId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "packs"] });
            toast.success("Пачка успешно удалена");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении пачки"));
        },
    });
}

// Получение предложений оборудования для пачки
export function useSuggestPackItems() {
    return useMutation({
        mutationFn: async (equipmentId: number) => {
            const response = await api.get<number[]>(`/admin/packs/suggestions/equipment?equipment_id=${equipmentId}`);
            return response.data;
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при получении предложений"));
        },
    });
}
