//src/hooks/useAdminEquipment.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import { EquipmentService } from "@/core/services/EquipmentService";
// Создание нового оборудования (для менеджеров и админов)
export function useCreateEquipment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (equipmentData) => {
            const response = await api.post("/equipment/", equipmentData);
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
        mutationFn: async (equipmentId) => {
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
        mutationFn: async (equipmentIds) => {
            // Выполняем параллельное удаление
            const deletePromises = equipmentIds.map(id => api.delete(`/equipment/${id}`));
            await Promise.all(deletePromises);
            return { deleted_count: equipmentIds.length };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            queryClient.invalidateQueries({ queryKey: ["allEquipment"] });
            queryClient.invalidateQueries({ queryKey: ["availability"] });
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
            toast.success(`Удалено ${data.deleted_count} единиц оборудования`);
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
        mutationFn: async (updates) => {
            // Выполняем параллельное обновление
            const updatePromises = updates.map(({ id, daily_rate }) => api.put(`/equipment/${id}`, { daily_rate }));
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
        mutationFn: async ({ sourceId, copyData }) => {
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
