// src/hooks/useReservations.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ReservationService, type ReservationCreateInput } from "@/core/services/ReservationService";
import type { Reservation } from "@/types/reservation";
import { handleQueryError } from "@/lib/queryHelpers";
import { useCurrentUser } from "./useProfile";
import { toast } from "sonner";
import { transformAccessoryLinks } from "@/lib/utils";
import { useReserveStore } from "@/store/reserveStore";

const RESERVATIONS_KEY = ["reservations"];

const invalidateReservationQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: ["availability"] });
    void queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
};

const handleMutationError = (error: unknown, contextMessage: string) => {
    console.error(`[useReservations] Error on ${contextMessage}:`, error);
    const apiError = error as { response?: { data?: { detail?: any } } };
    const detail = apiError.response?.data?.detail;
    let message = `Ошибка: ${contextMessage}`;

    if (typeof detail === 'string') {
        message = detail;
    } else if (typeof detail?.message === 'string') {
        message = detail.message;
    }

    toast.error(message);

    if (detail?.unavailable_ids) {
        const errorToThrow = new Error(message);
        (errorToThrow as any).unavailable_ids = detail.unavailable_ids;
        throw errorToThrow;
    }
};

interface UseReservationsParams {
    search?: string;
    status?: string;
    sort?: string;
}

export function useReservations(params?: UseReservationsParams) {
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();
    const navigate = useNavigate();
    const { clear: clearReserveStore } = useReserveStore.getState();

    const reservationsQuery = useQuery<Reservation[], Error>({
        queryKey: [...RESERVATIONS_KEY, params],
        queryFn: async (): Promise<Reservation[]> => {
            try {
                return await ReservationService.getUserReservations(params);
            } catch (error) {
                handleQueryError(error);
                throw error;
            }
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
        select: (data) => data?.map(transformAccessoryLinks) || [],
    });

    const createReservation = useMutation({
        mutationFn: (data: ReservationCreateInput) => ReservationService.createReservation(data),
        onSuccess: (newReservation) => { // newReservation может быть undefined
            // ДОБАВИТЬ ПРОВЕРКУ
            if (newReservation?.reservation_id) {
                invalidateReservationQueries(queryClient);
                toast.success("Резерв успешно создан!");
                
                // Очистить корзину перед навигацией
                clearReserveStore();
                
                navigate("/reservations/my", {
                    state: { 
                        highlightReservationId: newReservation.reservation_id,
                        from: 'new-reservation' // Указываем контекст создания
                    },
                });
            } else {
                // Если данные не пришли, все равно инвалидируем кэш и показываем общее сообщение
                invalidateReservationQueries(queryClient);
                toast.success("Запрос на создание резерва отправлен!");
                
                // Очистить корзину перед навигацией
                clearReserveStore();
                
                navigate("/reservations/my");
                console.error("API did not return reservation data on creation.");
            }
        },
        onError: (error) => handleMutationError(error, "не удалось создать резерв")
    });

    const updateReservation = useMutation({
        mutationFn: (data: any) => ReservationService.updateReservation(data),
        onSuccess: () => {
            invalidateReservationQueries(queryClient);
            toast.success("Резерв успешно обновлен!");
        },
        onError: (error) => handleMutationError(error, "не удалось обновить резерв")
    });

    const deleteReservation = useMutation({
        mutationFn: (id: number) => ReservationService.cancelReservation(id),
        onSuccess: () => {
            invalidateReservationQueries(queryClient);
            toast.success("Резерв успешно удален!");
        },
        onError: (error) => handleMutationError(error, "не удалось удалить резерв")
    });

    return {
        reservationsQuery,
        createReservation,
        updateReservation,
        deleteReservation,
    };
}