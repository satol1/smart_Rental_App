// src/hooks/useCalendarGrid.ts

import { useQuery } from "@tanstack/react-query"
import { useDateStore } from "@/store/dateStore"
import { formatDate } from "@/lib/utils"
import { CalendarService } from "@/core/services"
import type { CalendarGridData } from "@/core/services"

export function useCalendarGrid(equipmentIds: number[]) {
    const { startDate, endDate } = useDateStore()

    const formattedStartDateAPI = startDate ? formatDate(startDate) : null
    const formattedEndDateAPI = endDate ? formatDate(endDate) : null

    const enabled =
        !!formattedStartDateAPI &&
        !!formattedEndDateAPI &&
        equipmentIds.length > 0

    const queryKey = CalendarService.createQueryKey(
        formattedStartDateAPI!,
        formattedEndDateAPI!,
        equipmentIds
    )

    return useQuery<CalendarGridData>({
        queryKey: queryKey,
        queryFn: async () => {
            if (!formattedStartDateAPI || !formattedEndDateAPI) {
                return {}
            }
            if (equipmentIds.length === 0) {
                return {}
            }

            return CalendarService.getDayStatuses(
                formattedStartDateAPI,
                formattedEndDateAPI,
                equipmentIds
            )
        },
        enabled,
        staleTime: 60 * 1000,
        placeholderData: (previousData) => previousData,
    })
}