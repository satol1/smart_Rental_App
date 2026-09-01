// src/hooks/useDailyAvailability.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { DayStatus } from "@/types/availability";

type DailyAvailabilityData = Record<number, Record<string, DayStatus>>; // { equipmentId: { "DD.MM.YYYY": DayStatus } }

type Params = {
    ids: number[];
    start: Date;
    end: Date;
};

export function useDailyAvailability({ ids, start, end }: Params) {
    const formattedStartDate = formatDate(start);
    const formattedEndDate = formatDate(end);

    // Sort IDs to ensure consistent query key
    const sortedIds = JSON.stringify([...ids].sort((a, b) => a - b));

    return useQuery<DailyAvailabilityData>({
        queryKey: ["daily-availability", sortedIds, formattedStartDate, formattedEndDate],
        queryFn: async () => {
            const resp = await api.get("/calendar/day-statuses", {
                params: {
                    start: formattedStartDate,
                    end: formattedEndDate,
                    ids,
                },
            });
            // The actual data is nested inside equipment_day_statuses
            const result = resp.data?.equipment_day_statuses ?? {};
            

            
            return result;
        },
        enabled: ids.length > 0 && !!start && !!end,
        staleTime: 5 * 60 * 1000, // 5 mins
    });
}