// src/hooks/useAdminHolidayRules.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Типы, соответствующие Pydantic-схемам на бэкенде
interface HolidayRuleOut {
    id: number;
    rule_type: string;
    description: string;
    created_at: string;
}

interface RecurringHolidayRuleCreate {
    day_of_week: number;
    start_date: Date;
    end_date: Date;
    description: string;
}

// +++ НАЧАЛО ИЗМЕНЕНИЙ: Добавляем тип для ответа API +++
interface HolidayRuleListResponse {
    items: HolidayRuleOut[];
    total: number;
}
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++


const HOLIDAY_RULES_KEY = ["holidayRules"];
const HOLIDAYS_QUERY_KEY = ["holidays"];

// 1. Хук для получения списка правил
export function useGetHolidayRules() {
    // +++ НАЧАЛО ИЗМЕНЕНИЙ: Исправляем хук для работы с объектом ответа +++
    return useQuery<HolidayRuleListResponse, Error, HolidayRuleOut[]>({
        queryKey: HOLIDAY_RULES_KEY,
        queryFn: async () => {
            // 1. Ожидаем от API объект HolidayRuleListResponse
            const response = await api.get<HolidayRuleListResponse>("/holidays/rules");
            return response.data;
        },
        // 2. С помощью `select` извлекаем и возвращаем только массив `items`
        select: (data) => data.items,
    });
    // +++ КОНЕЦ ИЗМЕНЕНИЙ +++
}

// 2. Хук для создания правила еженедельных выходных
export function useCreateWeeklyRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: RecurringHolidayRuleCreate) => api.post("/holidays/recurring/weekly", data),
        onSuccess: () => {
            toast.success("Правило для еженедельных выходных успешно создано!");
            void queryClient.invalidateQueries({ queryKey: HOLIDAY_RULES_KEY });
            void queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Ошибка при создании правила");
        },
    });
}

// 3. Хук для импорта государственных праздников
export function useImportPublicHolidays() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ country_code, year }: { country_code: string; year: number }) =>
            api.post(`/holidays/import/public?country_code=${country_code}&year=${year}`),
        onSuccess: () => {
            toast.success("Государственные праздники успешно импортированы!");
            void queryClient.invalidateQueries({ queryKey: HOLIDAY_RULES_KEY });
            void queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Ошибка при импорте праздников");
        },
    });
}


// 4. Хук для удаления правила
export function useDeleteHolidayRule() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ruleId: number) => api.delete(`/holidays/rules/${ruleId}`),
        onSuccess: () => {
            toast.success("Правило и связанные с ним выходные удалены.");
            void queryClient.invalidateQueries({ queryKey: HOLIDAY_RULES_KEY });
            void queryClient.invalidateQueries({ queryKey: HOLIDAYS_QUERY_KEY });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || "Ошибка при удалении правила");
        },
    });
}