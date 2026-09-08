// src/hooks/useUpdateEquipmentDetails.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
export function useUpdateEquipmentDetails() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }) => {
            const payload = {};
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    const typedKey = key;
                    if (data[typedKey] !== undefined) {
                        payload[typedKey] = data[typedKey];
                    }
                }
            }
            const response = await api.put(`/equipment/${id}`, payload);
            return response.data;
        },
        onSuccess: async (updatedEquipment, variables) => {
            toast.success(`Оборудование "${updatedEquipment.name}" успешно обновлено!`);
            // Инвалидация и обновление кэша
            // 1. Инвалидируем общий список оборудования (используем правильный ключ)
            await queryClient.invalidateQueries({ queryKey: ["equipment"] });
            await queryClient.invalidateQueries({ queryKey: ["allEquipment"] });
            // 2. Точечно обновляем кэш для всех возможных ключей
            queryClient.setQueryData(["equipment"], (oldData) => oldData?.map((item) => item.id === variables.id ? { ...item, ...updatedEquipment } : item) ?? []);
            queryClient.setQueryData(["allEquipment"], (oldData) => oldData?.map((item) => item.id === variables.id ? { ...item, ...updatedEquipment } : item) ?? []);
            // 3. Инвалидируем данные о доступности
            await queryClient.invalidateQueries({ queryKey: ["availability"] });
            await queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
            await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
        },
        onError: (error) => {
            toast.error(`Ошибка при обновлении оборудования: ${error.message}`);
            console.error("Ошибка при обновлении оборудования:", error);
        },
    });
}
