// src/hooks/useAdminPromoCodes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++
const PROMO_CODES_QUERY_KEY = ["admin", "promocodes"];
/**
 * Хук для получения списка всех промокодов.
 */
export function useAdminPromoCodes() {
    // +++ НАЧАЛО ИЗМЕНЕНИЙ: Полностью исправленный хук +++
    return useQuery({
        queryKey: PROMO_CODES_QUERY_KEY,
        queryFn: async () => {
            // 1. Указываем, что API вернет объект PromoCodeListResponse
            const response = await api.get("/promocodes/");
            // 2. Возвращаем весь объект { items: [...], total: ... }
            return response.data;
        },
        // 3. С помощью опции `select` извлекаем только массив `items`.
        //    Компонент, использующий хук, получит уже готовый массив.
        select: (data) => data.items,
        staleTime: 5 * 60 * 1000, // 5 минут
    });
    // +++ КОНЕЦ ИЗМЕНЕНИЙ +++
}
/**
 * Запрашивает новый сгенерированный код с бэкенда.
 */
export async function fetchGeneratedPromoCode() {
    try {
        const response = await api.get("/promocodes/generate/new-code");
        return response.data.generated_code;
    }
    catch (error) {
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
        mutationFn: async (data) => {
            const response = await api.post("/promocodes/", data);
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
        mutationFn: async ({ id, data }) => {
            const response = await api.put(`/promocodes/${id}`, data);
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
        mutationFn: (id) => api.delete(`/promocodes/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: PROMO_CODES_QUERY_KEY });
            toast.success("Промокод удален");
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении промокода"));
        },
    });
}
