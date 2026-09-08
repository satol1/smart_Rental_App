// src/hooks/useAdminHolidays.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { AxiosError } from "axios";
import {
    HolidayService,
    type HolidayCreatePayload,
    type HolidayConflictErrorData,
    type HolidayCreateResult,
} from "@/core/services/HolidayService";
// +++ НАЧАЛО ИЗМЕНЕНИЙ: Импортируем нужные типы +++
import type { Holiday, HolidayListResponse } from "@/types/holiday";
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++


// Новый тип для внутреннего использования, где date является объектом Date
export interface HolidayWithDate extends Omit<Holiday, 'date'> {
    date: Date;
}

export type { HolidayCreatePayload };

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
        // Запрос уходит в HolidayService (единая точка доступа к API)
        queryFn: () => HolidayService.getHolidayList(formattedStart, formattedEnd, 100),
        // С помощью `select` извлекаем массив items и преобразуем даты
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
    return useMutation<HolidayCreateResult, AxiosError<HolidayConflictErrorData>, HolidayCreatePayload>({
        mutationFn: (data) => HolidayService.createHoliday(data),
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
        mutationFn: (date: Date) => HolidayService.deleteHoliday(date),
        onSuccess: () => {
            toast.success("Выходной день удален");
            void queryClient.invalidateQueries({ queryKey: [HOLIDAYS_QUERY_KEY] });
        },
        onError: (error: unknown) => {
            toast.error(getHolidayDeleteErrorMessage(error));
        },
    });
}

/** Извлекает сообщение об ошибке удаления из ответа API */
function getHolidayDeleteErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { detail?: string } } }).response;
        if (response?.data?.detail) {
            return response.data.detail;
        }
    }
    return "Ошибка при удалении выходного дня";
}
