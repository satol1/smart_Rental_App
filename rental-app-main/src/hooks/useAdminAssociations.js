// src/hooks/useAdminAssociations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++
const ADMIN_ASSOCIATIONS_KEY = ["admin", "associations"];
// Хук для получения данных такой же, как и публичный, но с другим ключом
export function useAdminAssociations() {
    // +++ НАЧАЛО ИЗМЕНЕНИЙ: Исправляем хук для работы с объектом ответа +++
    return useQuery({
        queryKey: ADMIN_ASSOCIATIONS_KEY,
        queryFn: async () => {
            // 1. Ожидаем от API объект AssociationListResponse
            const response = await api.get("/associations/");
            return response.data; // Возвращаем весь объект { items: [...], total: ... }
        },
        // 2. С помощью `select` извлекаем и возвращаем только массив `items`
        select: (data) => data.items,
    });
    // +++ КОНЕЦ ИЗМЕНЕНИЙ +++
}
export function useCreateAssociation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => api.post("/associations/", data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ADMIN_ASSOCIATIONS_KEY });
            toast.success("Ассоциация успешно создана");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка создания")),
    });
}
export function useUpdateAssociation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => api.put(`/associations/${id}`, data),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ADMIN_ASSOCIATIONS_KEY });
            toast.success("Ассоциация успешно обновлена");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка обновления")),
    });
}
export function useDeleteAssociation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => api.delete(`/associations/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ADMIN_ASSOCIATIONS_KEY });
            toast.success("Ассоциация удалена");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка удаления")),
    });
}
