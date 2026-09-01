import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface EquipmentAvailability {
    hasActiveReservations: boolean;
    hasActiveRentals: boolean;
    activeReservationsCount: number;
    activeRentalsCount: number;
}

export function useEquipmentAvailability(equipmentId: number) {
    return useQuery({
        queryKey: ["equipment-availability", equipmentId],
        queryFn: async () => {
            const response = await api.get<EquipmentAvailability>(`/equipment/${equipmentId}/availability`);
            return response.data;
        },
    });
} 