// src/hooks/useAdminDiscounts.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
// +++ НАЧАЛО ИЗМЕНЕНИЙ: Исправляем импорт +++
import type { DurationDiscount, DiscountPayload, DiscountListResponse } from "@/types/discount";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++

const DURATION_DISCOUNTS_KEY = "durationDiscounts";

export const useDurationDiscounts = (page: number = 1, pageSize: number = 10) => {
    const skip = (page - 1) * pageSize;
    return useQuery<DiscountListResponse>({
        queryKey: [DURATION_DISCOUNTS_KEY, page, pageSize],
        queryFn: async () => {
            const response = await api.get<DiscountListResponse>("/discounts/", {
                params: { skip, limit: pageSize }
            });
            return response.data;
        },
    });
};

export const useCreateDurationDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: DiscountPayload) => api.post("/discounts/", data),
        onSuccess: () => {
            toast.success("Новый уровень скидки добавлен");
            void queryClient.invalidateQueries({ queryKey: [DURATION_DISCOUNTS_KEY] });
        },
        onError: (e: any) => toast.error(e.response?.data?.detail || "Ошибка создания"),
    });
};

export const useUpdateDurationDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: DurationDiscount) => api.put(`/discounts/${id}`, data),
        onSuccess: () => {
            toast.success("Скидка обновлена");
            void queryClient.invalidateQueries({ queryKey: [DURATION_DISCOUNTS_KEY] });
        },
        onError: (e: any) => toast.error(e.response?.data?.detail || "Ошибка обновления"),
    });
};

export const useDeleteDurationDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.delete(`/discounts/${id}`),
        onSuccess: () => {
            toast.success("Скидка удалена");
            void queryClient.invalidateQueries({ queryKey: [DURATION_DISCOUNTS_KEY] });
        },
        onError: (e: any) => toast.error(e.response?.data?.detail || "Ошибка удаления"),
    });
};