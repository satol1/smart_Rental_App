// src/hooks/useReservations.ts

import { useMutation, useQueryClient, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ReservationService, type ReservationCreateInput, type ReservationUpdateInput } from "@/core/services/ReservationService";
import type { Reservation, ReservationListResponse } from "@/types/reservation";
import { handleQueryError, invalidateAvailability } from "@/lib/queryHelpers";
import { useCurrentUser } from "./useProfile";
import { toast } from "sonner";
import { transformAccessoryLinks } from "@/lib/utils";
import { useReserveStore } from "@/store/reserveStore";

const RESERVATIONS_KEY = ["reservations"];

/** Размер страницы «Мои резервы» (infinite-пагинация, этап 5.4 аудита) */
const MY_RESERVATIONS_PAGE_SIZE = 20;

const invalidateReservationQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    void queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    invalidateAvailability(queryClient);
    void queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
};

/** Ошибка API с деталями о недоступных позициях */
interface ReservationApiErrorDetail {
    message?: string;
    unavailable_ids?: number[];
}

interface ReservationApiError {
    response?: { data?: { detail?: string | ReservationApiErrorDetail } };
}

/** Ошибка с дополнительным полем unavailable_ids (передаётся в UI) */
interface ReservationMutationError extends Error {
    unavailable_ids?: number[];
}

const handleMutationError = (error: unknown, contextMessage: string) => {
    console.error(`[useReservations] Error on ${contextMessage}:`, error);
    const apiError = (error instanceof Object && "response" in error)
        ? (error as ReservationApiError)
        : undefined;
    const detail = apiError?.response?.data?.detail;
    let message = `Ошибка: ${contextMessage}`;

    if (typeof detail === 'string') {
        message = detail;
    } else if (typeof detail?.message === 'string') {
        message = detail.message;
    }

    toast.error(message);

    if (detail && typeof detail === 'object' && detail.unavailable_ids) {
        const errorToThrow: ReservationMutationError = new Error(message);
        errorToThrow.unavailable_ids = detail.unavailable_ids;
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

    // Infinite-пагинация: раньше серверный hard-cap (limit<=100) молча обрезал
    // старые резервы активного клиента; теперь страницы догружаются по скроллу.
    // select уплощает страницы — потребители работают с плоским Reservation[].
    const reservationsQuery = useInfiniteQuery<ReservationListResponse, Error, Reservation[], readonly unknown[], number>({
        queryKey: [...RESERVATIONS_KEY, "infinite", params],
        queryFn: async ({ pageParam }) => {
            try {
                return await ReservationService.getUserReservationsPage(
                    params ?? {},
                    pageParam * MY_RESERVATIONS_PAGE_SIZE,
                    MY_RESERVATIONS_PAGE_SIZE,
                );
            } catch (error) {
                handleQueryError(error);
                throw error;
            }
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage: ReservationListResponse, allPages: ReservationListResponse[]) => {
            const loaded = allPages.reduce((acc, page) => acc + page.items.length, 0);
            return loaded < lastPage.total ? allPages.length : undefined;
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
        select: (data: InfiniteData<ReservationListResponse, number>) =>
            data.pages.flatMap(page => page.items).map(transformAccessoryLinks),
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
        mutationFn: (data: ReservationUpdateInput) => ReservationService.updateReservation(data),
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
            toast.success("Резерв успешно отменен!");
        },
        onError: (error) => handleMutationError(error, "не удалось отменить резерв")
    });

    return {
        reservationsQuery,
        createReservation,
        updateReservation,
        deleteReservation,
    };
}