// src/hooks/useDailyAvailability.ts
import { useQuery } from "@tanstack/react-query";
import { AvailabilityService } from "@/core/services";
import { formatDate } from "@/lib/utils";
import type { DailyAvailabilityData } from "@/types/availability";

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
        queryFn: () => AvailabilityService.getDailyStatuses({
            startDate: start,
            endDate: end,
            equipmentIds: ids,
        }),
        enabled: ids.length > 0 && !!start && !!end,
        staleTime: 5 * 60 * 1000, // 5 mins
    });
}