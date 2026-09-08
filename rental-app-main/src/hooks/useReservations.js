// src/hooks/useReservations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ReservationService } from "@/core/services/ReservationService";
import { handleQueryError } from "@/lib/queryHelpers";
import { useCurrentUser } from "./useProfile";
import { toast } from "sonner";
import { transformAccessoryLinks } from "@/lib/utils";
import { useReserveStore } from "@/store/reserveStore";
const RESERVATIONS_KEY = ["reservations"];
const invalidateReservationQueries = (queryClient) => {
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    void queryClient.invalidateQueries({ queryKey: ["availability"] });
    void queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
};
const handleMutationError = (error, contextMessage) => {
    console.error(`[useReservations] Error on ${contextMessage}:`, error);
    const apiError = (error instanceof Object && "response" in error)
        ? error
        : undefined;
    const detail = apiError?.response?.data?.detail;
    let message = `Ошибка: ${contextMessage}`;
    if (typeof detail === 'string') {
        message = detail;
    }
    else if (typeof detail?.message === 'string') {
        message = detail.message;
    }
    toast.error(message);
    if (detail && typeof detail === 'object' && detail.unavailable_ids) {
        const errorToThrow = new Error(message);
        errorToThrow.unavailable_ids = detail.unavailable_ids;
        throw errorToThrow;
    }
};
export function useReservations(params) {
    const queryClient = useQueryClient();
    const { data: user } = useCurrentUser();
    const navigate = useNavigate();
    const { clear: clearReserveStore } = useReserveStore.getState();
    const reservationsQuery = useQuery({
        queryKey: [...RESERVATIONS_KEY, params],
        queryFn: async () => {
            try {
                return await ReservationService.getUserReservations(params);
            }
            catch (error) {
                handleQueryError(error);
                throw error;
            }
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
        select: (data) => data?.map(transformAccessoryLinks) || [],
    });
    const createReservation = useMutation({
        mutationFn: (data) => ReservationService.createReservation(data),
        onSuccess: (newReservation) => {
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
            }
            else {
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
        mutationFn: (data) => ReservationService.updateReservation(data),
        onSuccess: () => {
            invalidateReservationQueries(queryClient);
            toast.success("Резерв успешно обновлен!");
        },
        onError: (error) => handleMutationError(error, "не удалось обновить резерв")
    });
    const deleteReservation = useMutation({
        mutationFn: (id) => ReservationService.cancelReservation(id),
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
