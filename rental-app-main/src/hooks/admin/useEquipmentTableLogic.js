// src/hooks/admin/useEquipmentTableLogic.ts
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useProfile";
// ⛔️ Удаляем useEquipment, так как хук больше не будет загружать данные сам
// import { useEquipment } from "@/hooks/useEquipment";
import { useDeleteEquipment, useBulkDeleteEquipment } from "@/hooks/useAdminEquipment";
import { api } from "@/lib/api";
import { toast } from "sonner";
// ✅ Хук теперь принимает массив оборудования как аргумент
export const useEquipmentTableLogic = (equipment = []) => {
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    // ⛔️ Удаляем внутренний вызов useEquipment()
    // const { data: equipment = [], isLoading, error } = useEquipment();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const deleteEquipmentMutation = useDeleteEquipment();
    const bulkDeleteMutation = useBulkDeleteEquipment();
    const isManager = currentUser?.role === "manager" || currentUser?.role === "admin";
    const filteredEquipment = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        return equipment.filter(item => item.name.toLowerCase().includes(lowerCaseQuery) ||
            item.brand.toLowerCase().includes(lowerCaseQuery) ||
            item.equipment_type.toLowerCase().includes(lowerCaseQuery) ||
            (item.serial_number && item.serial_number.toLowerCase().includes(lowerCaseQuery)));
    }, [equipment, searchQuery]);
    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? filteredEquipment.map(item => item.id) : []);
    };
    const handleSelectItem = (itemId, checked) => {
        setSelectedIds(prev => checked ? [...prev, itemId] : prev.filter(id => id !== itemId));
    };
    const handleDelete = async (itemId) => {
        if (!isManager)
            return;
        try {
            const availability = await queryClient.fetchQuery({
                queryKey: ["equipment-availability", itemId],
                queryFn: async () => (await api.get(`/equipment/${itemId}/availability`)).data,
            });
            if (availability.hasActiveReservations || availability.hasActiveRentals) {
                const messages = [];
                if (availability.hasActiveReservations)
                    messages.push(`${availability.activeReservationsCount} активных резервов`);
                if (availability.hasActiveRentals)
                    messages.push(`${availability.activeRentalsCount} активных аренд`);
                toast.error(`Невозможно удалить: у оборудования есть ${messages.join(" и ")}.`);
                return;
            }
            const equipmentToDelete = filteredEquipment.find(item => item.id === itemId);
            if (window.confirm(`Удалить "${equipmentToDelete?.name}"? Действие нельзя отменить.`)) {
                deleteEquipmentMutation.mutate(itemId);
            }
        }
        catch (err) {
            toast.error("Ошибка при проверке статуса оборудования.");
            console.error("Availability check failed:", err);
        }
    };
    const handleBulkDelete = () => {
        if (!isManager || selectedIds.length === 0)
            return;
        if (window.confirm(`Удалить ${selectedIds.length} ед. оборудования?`)) {
            bulkDeleteMutation.mutate(selectedIds, {
                onSuccess: () => setSelectedIds([]),
            });
        }
    };
    const handlers = {
        setSearchQuery,
        handleSelectAll,
        handleSelectItem,
        handleDelete,
        handleBulkDelete
    };
    return {
        isManager,
        // ✅ Так как загрузка происходит выше, здесь мы считаем, что её нет
        isLoading: false,
        error: null,
        equipment,
        filteredEquipment,
        searchQuery,
        selectedIds,
        deleteEquipmentMutation,
        bulkDeleteMutation,
        handlers,
    };
};
