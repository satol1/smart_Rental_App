// src/hooks/useAdminPromoCodes.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
// +++ НАЧАЛО ИЗМЕНЕНИЙ: Импортируем новый тип +++
import type {
    PromoCodeOut,
    PromoCodeCreate,
    PromoCodeUpdate,
    PromoCodeListResponse
} from "@/types/promo_code";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++

const PROMO_CODES_QUERY_KEY = ["admin", "promocodes"];

/**
 * Хук для получения страницы промокодов (пагинация, этап 5.4: limit=100 без
 * пагинации скрывал 101-й и следующие коды).
 */
export const PROMO_CODES_PAGE_SIZE = 50;

export function useAdminPromoCodes(page: number = 1) {
    const skip = (page - 1) * PROMO_CODES_PAGE_SIZE;

    return useQuery<PromoCodeListResponse, Error, { items: PromoCodeOut[]; total: number }>({
        queryKey: [...PROMO_CODES_QUERY_KEY, page],
        queryFn: async () => {
            const response = await api.get<PromoCodeListResponse>("/promocodes/", {
                params: { skip, limit: PROMO_CODES_PAGE_SIZE },
            });
            return response.data;
        },
        select: (data) => ({ items: data.items, total: data.total }),
        placeholderData: (prev) => prev, // не мигает таблица при смене страницы
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

/**
 * Запрашивает новый сгенерированный код с бэкенда.
 */
export async function fetchGeneratedPromoCode(): Promise<string> {
    try {
        const response = await api.get<{ generated_code: string }>("/promocodes/generate/new-code");
        return response.data.generated_code;
    } catch (error) {
        toast.error("Ошибка при генерации кода");
        console.error("Failed to generate promo code:", error);
        return "";
    }
}

/**
 * Хук для создания нового промокода.
 */
export function useCreatePromoCode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: PromoCodeCreate) => {
            const response = await api.post<PromoCodeOut>("/promocodes/", data);
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PROMO_CODES_QUERY_KEY });
            toast.success("Промокод успешно создан");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при создании промокода"));
        },
    });
}

/**
 * Хук для обновления промокода.
 */
export function useUpdatePromoCode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: PromoCodeUpdate }) => {
            const response = await api.put<PromoCodeOut>(`/promocodes/${id}`, data);
            return response.data;
        },
        onSuccess: (updatedPromoCode) => {
            void queryClient.invalidateQueries({ queryKey: PROMO_CODES_QUERY_KEY });
            toast.success(`Промокод "${updatedPromoCode.code}" успешно обновлен`);
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при обновлении промокода"));
        },
    });
}

/**
 * Хук для удаления промокода.
 */
export function useDeletePromoCode() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.delete(`/promocodes/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PROMO_CODES_QUERY_KEY });
            toast.success("Промокод удален");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении промокода"));
        },
    });
}