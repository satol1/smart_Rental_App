// src/hooks/useAdminRentals.ts

import { useInfiniteQuery, useMutation, useQueryClient, type QueryFunctionContext } from "@tanstack/react-query";
import { toast } from "sonner";
import { RentalService, type AdminRentalsParams, type ConvertReservationPayload, type ReturnRentalPayload } from "@/core/services";
import type { AdminRentalListResponse, RentalCreateFromScratchData } from "@/types/rental";
import { useRentalReceiptStore } from "@/store/rentalReceiptStore";
import { getApiErrorMessage, invalidateAvailability } from "@/lib/queryHelpers";
import type { AdminRentalUpdateData } from "@/core/services";

const ADMIN_RENTALS_QUERY_KEY = ["adminRentals"];
const ADMIN_RESERVATIONS_QUERY_KEY = ["adminReservations"];


export function useAdminRentals(params: AdminRentalsParams = {}) {
    const { limit = 10, status, search, periodType, periodOffset } = params;

    return useInfiniteQuery<AdminRentalListResponse, Error>({
        queryKey: [...ADMIN_RENTALS_QUERY_KEY, { status, search, periodType, periodOffset }],
        queryFn: async ({ pageParam = 0 }: QueryFunctionContext) => {
            const skip = (pageParam as number) * limit;
            return await RentalService.getAdminRentals({ status, search, skip, limit, periodType, periodOffset });
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const loadedItems = allPages.reduce((acc, page) => acc + page.items.length, 0);
            if (loadedItems < lastPage.total) {
                return allPages.length;
            }
            return undefined;
        },
        staleTime: 60 * 1000,
    });
}

export function useConvertReservationToRental() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (payload: ConvertReservationPayload) =>
            RentalService.convertReservationToRental(payload),
        onSuccess: async (newRentalData) => {
            // `newRentalData` уже содержит данные аренды (AdminRentalOut) от RentalService
            // Проверяем, что данные корректны
            if (!newRentalData || !newRentalData.id) {
                console.error("Invalid rental data received:", newRentalData);
                toast.error("Ошибка при получении данных аренды");
                return;
            }
            
            // Показываем уведомление об успехе
            toast.success(`Аренда #${newRentalData.id} успешно создана!`);
            
            // Устанавливаем состояние загрузки и открываем диалог
            const { setLoading, openReceipt } = useRentalReceiptStore.getState();
            setLoading(true);
            openReceipt(newRentalData);
            
            // Небольшая задержка для плавного перехода
            setTimeout(() => {
                setLoading(false);
            }, 50);
            
            // Инвалидируем кеш
            queryClient.invalidateQueries({ queryKey: ADMIN_RENTALS_QUERY_KEY, exact: false });
            queryClient.invalidateQueries({ queryKey: ADMIN_RESERVATIONS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            console.error("Conversion error:", error);
            // Сбрасываем состояние загрузки в случае ошибки
            const { setLoading } = useRentalReceiptStore.getState();
            setLoading(false);
            throw error;
        },
    });
}

export function useDeleteAdminRental() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (rentalId: number) => RentalService.deleteAdminRental(rentalId),
        onSuccess: () => {
            toast.success("Аренда успешно удалена");
            queryClient.invalidateQueries({ queryKey: ADMIN_RENTALS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при удалении аренды"));
        },
    });
}

export function useReturnRental() {
    const queryClient = useQueryClient();
    return useMutation({
        // +++ ИЗМЕНЕНИЕ: Мутация теперь принимает новый payload +++
        mutationFn: (payload: ReturnRentalPayload) =>
            RentalService.returnRental(payload),
        onSuccess: () => {
            toast.success("Возврат аренды успешно оформлен!");
            queryClient.invalidateQueries({ queryKey: ADMIN_RENTALS_QUERY_KEY, exact: false });
            invalidateAvailability(queryClient);
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при оформлении возврата"));
        },
    });
}

export function useRevertRentalToReservation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ rentalId, refundPrepayment }: { rentalId: number; refundPrepayment: boolean }) =>
            RentalService.revertRentalToReservation(rentalId, refundPrepayment),
        onSuccess: () => {
            toast.success("Выдача аренды успешно отменена!");
            queryClient.invalidateQueries({ queryKey: ADMIN_RENTALS_QUERY_KEY, exact: false });
            queryClient.invalidateQueries({ queryKey: ADMIN_RESERVATIONS_QUERY_KEY, exact: false });
            // Добавим инвалидацию истории баланса, так как она изменится
            queryClient.invalidateQueries({ queryKey: ["balanceHistory"] });
        },
        onError: (error) => {
            const errorMessage = getApiErrorMessage(error, "Ошибка при отмене выдачи аренды");
            toast.error(errorMessage);
        },
    });
}


export function useCreateAdminRentalFromScratch() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: RentalCreateFromScratchData) =>
            RentalService.createRentalFromScratch(data),
        onSuccess: async (newRentalData) => {
            // `newRentalData` уже содержит данные аренды (AdminRentalOut) от RentalService
            // Проверяем, что данные корректны
            if (!newRentalData || !newRentalData.id) {
                console.error("Invalid rental data received:", newRentalData);
                toast.error("Ошибка при получении данных аренды");
                return;
            }
            
            // Показываем уведомление об успехе
            toast.success(`Аренда #${newRentalData.id} успешно создана!`);
            
            // Устанавливаем состояние загрузки и открываем диалог
            const { setLoading, openReceipt } = useRentalReceiptStore.getState();
            setLoading(true);
            openReceipt(newRentalData);
            
            // Небольшая задержка для плавного перехода
            setTimeout(() => {
                setLoading(false);
            }, 50);
            
            // Инвалидируем кеш
            queryClient.invalidateQueries({ queryKey: ADMIN_RENTALS_QUERY_KEY, exact: false });
            invalidateAvailability(queryClient);
            queryClient.invalidateQueries({ queryKey: ["calendar-grid"] });
        },
        onError: (error) => {
            console.error("Create rental from scratch error:", error);
            // Сбрасываем состояние загрузки в случае ошибки
            const { setLoading } = useRentalReceiptStore.getState();
            setLoading(false);
            
            const errorMessage = getApiErrorMessage(error, "Ошибка при создании аренды");
            toast.error(errorMessage);
        },
    });
}

export function useUpdateAdminRental() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (payload: { rentalId: number; data: AdminRentalUpdateData }) =>
            RentalService.updateAdminRental(payload),
        onSuccess: () => {
            toast.success("Аренда успешно обновлена");
            queryClient.invalidateQueries({ queryKey: ADMIN_RENTALS_QUERY_KEY, exact: false });
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, "Ошибка при обновлении аренды"));
        },
    });
}