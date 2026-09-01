// src/hooks/useCalendarEventDetails.ts

import { useQuery } from "@tanstack/react-query";
import { CalendarService } from "@/core/services/CalendarService";

export interface CalendarEventDetailsParams {
  orderType: "reservation" | "rental";
  orderId: number;
}

export function useCalendarEventDetails(
  orderType?: "reservation" | "rental",
  orderId?: number
) {
  return useQuery({
    queryKey: orderType && orderId 
      ? CalendarService.createEventDetailsQueryKey(orderType, orderId)
      : ["calendar-event-details", "disabled"],
    queryFn: () => {
      if (!orderType || !orderId) {
        throw new Error("orderType and orderId are required");
      }
      return CalendarService.getEventDetails(orderType, orderId);
    },
    enabled: !!(orderType && orderId), // Запрос выполняется только при наличии параметров
    staleTime: 5 * 60 * 1000, // 5 минут
    retry: 1, // Одна попытка повтора при ошибке
  });
}
