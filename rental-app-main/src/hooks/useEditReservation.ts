// path: rental-app-main/src/hooks/useEditReservation.ts

import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { ReservationService } from "@/core/services";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/queryHelpers";
import type { AdminReservationListResponse } from "@/types/reservation";

interface EditReservationInput {
    id: number;
    start_date: string;
    end_date: string;
    equipment_ids: number[];
    /** undefined — не менять; null — явно сбросить; строка — применить код */
    promo_code?: string | null;
    selected_accessories?: Record<number, number[]>;
    isAdminContext?: boolean;
    confirm_date_adjustment?: boolean;
}

// ✅ ИСПРАВЛЕНИЕ: Хук теперь принимает ОДИН аргумент-объект с опциональными колбэками
export function useEditReservation({
    onSuccessCallback,
    onClearState,
}: {
    onSuccessCallback?: () => void;
    onClearState?: () => void;
}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: EditReservationInput) => {
            const { id, isAdminContext, ...payload } = data;
            const servicePayload = {
                id,
                start_date: payload.start_date,
                end_date: payload.end_date,
                equipment_ids: payload.equipment_ids,
                promo_code: payload.promo_code,
                selected_accessories: payload.selected_accessories || {},
                isAdminContext,
                confirm_date_adjustment: payload.confirm_date_adjustment,
            };
            // Сервис остается без изменений
            return await ReservationService.updateReservation(servicePayload);
        },
        onSuccess: (updatedReservation, variables) => {
            toast.success(`Резерв #${variables.id} успешно обновлен!`);

            // 1. ОПРЕДЕЛЯЕМ БАЗОВЫЙ КЛЮЧ
            // ВАЖНО: ADMIN_RESERVATIONS_QUERY_KEY = ["adminReservations"], поэтому используем его напрямую
            const queryKey = variables.isAdminContext 
                ? ["adminReservations"] 
                : ["reservations"];

            // 2. НЕМЕДЛЕННО ОБНОВЛЯЕМ КЭШ ДЛЯ МГНОВЕННОГО ОТОБРАЖЕНИЯ
            if (variables.isAdminContext) {
                // Обновляем все запросы админских резервов
                queryClient.setQueriesData<InfiniteData<AdminReservationListResponse>>(
                    { queryKey, exact: false },
                    (oldData) => {
                        if (!oldData || !oldData.pages) return oldData;
                        
                        return {
                            ...oldData,
                            pages: oldData.pages.map(page => ({
                                ...page,
                                items: page.items.map(item => 
                                    item.id === updatedReservation.id ? updatedReservation : item
                                ),
                            })),
                        };
                    }
                );
            } else {
                // 🔧 ИСПРАВЛЕНИЕ: Обновляем кэш для пользовательских резервов
                
                queryClient.setQueriesData<unknown>(
                    { queryKey, exact: false },
                    (oldData: unknown) => {
                        
                        if (!oldData) return oldData;
                        
                        // Если это InfiniteData (пагинированные данные)
                        const asRecord = oldData as { pages?: Array<{ items?: Array<{ id: number }> }> };

                        if (Array.isArray(asRecord.pages)) {
                            return {
                                ...oldData,
                                pages: asRecord.pages.map(page => ({
                                    ...page,
                                    items: (page.items ?? []).map(item =>
                                        item.id === updatedReservation.id ? updatedReservation : item
                                    ),
                                })),
                            };
                        }

                        // Если это обычный массив (пользовательские резервы)
                        if (Array.isArray(oldData)) {
                            const items = oldData as Array<{ id: number }>;
                            const updatedArray = items.map(item =>
                                item.id === updatedReservation.id ? updatedReservation : item
                            );
                            return updatedArray;
                        }
                        
                        return oldData;
                    }
                );
            }

            // 3. ИНВАЛИДИРУЕМ ВСЕ ЗАПРОСЫ, НАЧИНАЮЩИЕСЯ С БАЗОВОГО КЛЮЧА
            queryClient.invalidateQueries({ 
                queryKey, 
                exact: false 
            });

            // 4. Вызываем колбэки для управления UI (закрытие формы и т.д.)
            if (onSuccessCallback) onSuccessCallback();
            if (onClearState) onClearState();

            // 5. Инвалидация связанных данных (хорошая практика)
            queryClient.invalidateQueries({ queryKey: ["availability"] });
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
        },
        onError: (error: unknown, variables) => {
            console.error(`Ошибка при обновлении резерва #${variables.id}:`, error);
            const message = getApiErrorMessage(error, "Ошибка при сохранении изменений.");
            toast.error(message);
            // Пробрасываем ошибку дальше, если это необходимо для UI
            throw error;
        },
    });
}