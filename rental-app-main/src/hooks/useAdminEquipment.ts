//src/hooks/useAdminEquipment.ts


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import type { Equipment } from "@/types/equipment";
import { EquipmentService, type EquipmentCopyRequest } from "@/core/services/EquipmentService";

export interface EquipmentCreateData {
    equipment_type: string;
    brand: string;
    name: string;
    serial_number?: string | null | undefined;
    condition?: string;
    daily_rate: number;
    notes?: string | null | undefined;
    description?: string | null | undefined;
    last_maintenance?: string | null | undefined; // format: YYYY-MM-DD
    short_description?: string | null | undefined;
    image_url?: string | null | undefined;
    image_urls?: string[];
    accessory_ids?: number[];
}

// Создание нового оборудования (для менеджеров и админов)
export function useCreateEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (equipmentData: EquipmentCreateData) => {
            const response = await api.post<Equipment>("/equipment/", equipmentData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            queryClient.invalidateQueries({ queryKey: ["allEquipment"] });
            queryClient.invalidateQueries({ queryKey: ["availability"] });
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
            toast.success("Оборудование успешно создано");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при создании оборудования"));
        },
    });
}

// Удаление оборудования (для менеджеров и админов)
export function useDeleteEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (equipmentId: number) => {
            const response = await api.delete(`/equipment/${equipmentId}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            queryClient.invalidateQueries({ queryKey: ["allEquipment"] });
            queryClient.invalidateQueries({ queryKey: ["availability"] });
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
            toast.success("Оборудование удалено");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении оборудования"));
        },
    });
}

// Массовое удаление оборудования
export function useBulkDeleteEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (equipmentIds: number[]) => {
            // Параллельное удаление с индивидуальной обработкой отказов:
            // часть единиц может быть заблокирована активными заказами (409)
            const results = await Promise.allSettled(
                equipmentIds.map(id => api.delete(`/equipment/${id}`))
            );
            const deleted = results.filter(r => r.status === "fulfilled").length;
            const rejected = results.filter(r => r.status === "rejected").length;
            return { deleted_count: deleted, blocked_count: rejected };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            queryClient.invalidateQueries({ queryKey: ["allEquipment"] });
            queryClient.invalidateQueries({ queryKey: ["availability"] });
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
            if (data.blocked_count > 0) {
                toast.warning(
                    `Удалено ${data.deleted_count} из ${data.deleted_count + data.blocked_count}. ` +
                    `${data.blocked_count} ед. участвуют в незавершённых заказах.`
                );
            } else {
                toast.success(`Удалено ${data.deleted_count} единиц оборудования`);
            }
        },
        onError: () => {
            toast.error("Ошибка при массовом удалении оборудования");
        },
    });
}

// Массовое обновление тарифов
export function useBulkUpdateRates() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (updates: { id: number; daily_rate: number }[]) => {
            // Выполняем параллельное обновление
            const updatePromises = updates.map(({ id, daily_rate }) => 
                api.put(`/equipment/${id}`, { daily_rate })
            );
            await Promise.all(updatePromises);
            return { updated_count: updates.length };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            queryClient.invalidateQueries({ queryKey: ["allEquipment"] });
            toast.success(`Обновлены тарифы для ${data.updated_count} единиц оборудования`);
        },
        onError: () => {
            toast.error("Ошибка при массовом обновлении тарифов");
        },
    });
}

// Копирование оборудования
export function useCopyEquipment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ sourceId, copyData }: { sourceId: number; copyData: EquipmentCopyRequest }) => {
            return await EquipmentService.copyEquipment(sourceId, copyData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            queryClient.invalidateQueries({ queryKey: ["allEquipment"] });
            queryClient.invalidateQueries({ queryKey: ["availability"] });
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
            toast.success("Оборудование успешно скопировано");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при копировании оборудования"));
        },
    });
}
