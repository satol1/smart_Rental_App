// src/hooks/useAdminDiscounts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++
const DURATION_DISCOUNTS_KEY = "durationDiscounts";
export const useDurationDiscounts = (page = 1, pageSize = 10) => {
    const skip = (page - 1) * pageSize;
    return useQuery({
        queryKey: [DURATION_DISCOUNTS_KEY, page, pageSize],
        queryFn: async () => {
            const response = await api.get("/discounts/", {
                params: { skip, limit: pageSize }
            });
            return response.data;
        },
    });
};
export const useCreateDurationDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data) => api.post("/discounts/", data),
        onSuccess: () => {
            toast.success("Новый уровень скидки добавлен");
            void queryClient.invalidateQueries({ queryKey: [DURATION_DISCOUNTS_KEY] });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка создания")),
    });
};
export const useUpdateDurationDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => api.put(`/discounts/${id}`, data),
        onSuccess: () => {
            toast.success("Скидка обновлена");
            void queryClient.invalidateQueries({ queryKey: [DURATION_DISCOUNTS_KEY] });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка обновления")),
    });
};
export const useDeleteDurationDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => api.delete(`/discounts/${id}`),
        onSuccess: () => {
            toast.success("Скидка удалена");
            void queryClient.invalidateQueries({ queryKey: [DURATION_DISCOUNTS_KEY] });
        },
        onError: (e) => toast.error(getApiErrorMessage(e, "Ошибка удаления")),
    });
};
