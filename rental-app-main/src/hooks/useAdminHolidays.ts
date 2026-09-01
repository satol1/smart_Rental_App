// src/hooks/useAdminHolidays.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AxiosError } from "axios";
// +++ НАЧАЛО ИЗМЕНЕНИЙ: Импортируем нужные типы +++
import type { Holiday, HolidayListResponse } from "@/types/holiday";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++


// Новый тип для внутреннего использования, где date является объектом Date
export interface HolidayWithDate extends Omit<Holiday, 'date'> {
    date: Date;
}

export interface HolidayCreatePayload {
    date: string; // YYYY-MM-DD
    description?: string;
    force?: boolean; // Флаг для подтверждения создания при конфликтах
}

// Тип для ошибки конфликта от API
interface ConflictErrorData {
    detail: {
        message: string;
        conflicting_reservation_ids: number[];
    };
}

const HOLIDAYS_QUERY_KEY = "holidays";

/**
 * Хук для получения списка выходных в заданном диапазоне дат.
 */
export function useHolidays(startDate: Date, endDate: Date) {
    const formattedStart = formatDate(startDate);
    const formattedEnd = formatDate(endDate);

    // +++ НАЧАЛО ИЗМЕНЕНИЙ: Полностью исправленный хук +++
    return useQuery<HolidayListResponse, Error, HolidayWithDate[]>({
        queryKey: [HOLIDAYS_QUERY_KEY, formattedStart, formattedEnd],
        queryFn: async () => {
            const response = await api.get<HolidayListResponse>("/holidays/", {
                params: {
                    start_date: formattedStart,
                    end_date: formattedEnd,
                    // 1. Добавляем недостающий параметр limit
                    limit: 100,
                },
            });
            return response.data; // Возвращаем весь объект { items: [...], total: ... }
        },
        // 2. С помощью `select` извлекаем массив items и преобразуем даты
        select: (data) => {
            return data.items.map(h => ({ ...h, date: new Date(h.date) }));
        },
        enabled: !!startDate && !!endDate,
    });
    // +++ КОНЕЦ ИЗМЕНЕНИЙ +++
}

/**
 * Хук для создания нового выходного дня.
 * Обрабатывает специфическую ошибку конфликта (409).
 */
export function useCreateHoliday() {
    const queryClient = useQueryClient();
    return useMutation<unknown, AxiosError<ConflictErrorData>, HolidayCreatePayload>({
        mutationFn: (data) => api.post("/holidays/", data),
        onSuccess: () => {
            toast.success("Выходной день успешно добавлен");
            void queryClient.invalidateQueries({ queryKey: [HOLIDAYS_QUERY_KEY] });
        },
        onError: (error) => {
            if (error.response?.status === 409) {
                // Ошибка конфликта будет обработана в компоненте
                return;
            }
            toast.error(error.response?.data?.detail?.message || "Ошибка при создании выходного дня");
        },
    });
}

/**
 * Хук для удаления выходного дня.
 */
export function useDeleteHoliday() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (date: Date) => api.delete(`/holidays/${formatDate(date)}`),
        onSuccess: () => {
            toast.success("Выходной день удален");
            void queryClient.invalidateQueries({ queryKey: [HOLIDAYS_QUERY_KEY] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Ошибка при удалении выходного дня");
        },
    });
}