// src/hooks/useAdminAssociations.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
// +++ НАЧАЛО ИЗМЕНЕНИЙ: Импортируем тип для ответа с пагинацией +++
import type { Association, AssociationCreate, AssociationUpdate, AssociationListResponse } from "@/types/association";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++

const ADMIN_ASSOCIATIONS_KEY = ["admin", "associations"];

// Хук для получения данных такой же, как и публичный, но с другим ключом
export function useAdminAssociations() {
    // +++ НАЧАЛО ИЗМЕНЕНИЙ: Исправляем хук для работы с объектом ответа +++
    return useQuery<AssociationListResponse, Error, Association[]>({
        queryKey: ADMIN_ASSOCIATIONS_KEY,
        queryFn: async () => {
            // 1. Ожидаем от API объект AssociationListResponse
            const response = await api.get<AssociationListResponse>("/associations/", {
                params: { limit: 100 },
            });
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
        mutationFn: (data: AssociationCreate) => api.post<Association>("/associations/", data),
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
        mutationFn: ({ id, data }: { id: number, data: AssociationUpdate }) =>
            api.put<Association>(`/associations/${id}`, data),
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
        mutationFn: (id: number) => api.delete(`/associations/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ADMIN_ASSOCIATIONS_KEY });
            toast.success("Ассоциация удалена");
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка удаления")),
    });
}