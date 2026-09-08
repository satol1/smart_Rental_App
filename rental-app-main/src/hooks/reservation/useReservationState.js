// src/hooks/reservation/useReservationState.ts
import { useState, useMemo, useCallback } from "react";
function createDisplayLabel(equipmentItem) {
    return `${equipmentItem.equipment_type} ${equipmentItem.brand} ${equipmentItem.name}`;
}
export function useReservationState(reservation, initialEquipmentForDisplay) {
    const initialValues = useMemo(() => ({
        startDate: new Date(reservation.start_date),
        endDate: new Date(reservation.end_date),
        equipmentIds: new Set(reservation.equipment_ids),
        equipmentDetails: [...initialEquipmentForDisplay],
        accessories: reservation.selected_accessories || {},
    }), [reservation, initialEquipmentForDisplay]);
    const [state, setState] = useState({
        startDate: initialValues.startDate,
        endDate: initialValues.endDate,
        originalEquipmentIds: initialValues.equipmentIds,
        currentEquipmentDetails: initialValues.equipmentDetails,
        newlyAddedEquipmentIds: new Set(),
        localSelectedAccessories: initialValues.accessories,
    });
    // ✨ Вычисляем hasChanges через useMemo
    const hasChanges = useMemo(() => {
        const datesChanged = state.startDate.getTime() !== initialValues.startDate.getTime() ||
            state.endDate.getTime() !== initialValues.endDate.getTime();
        const currentIdSet = new Set(state.currentEquipmentDetails.map(eq => eq.id));
        const equipmentChanged = initialValues.equipmentIds.size !== currentIdSet.size ||
            !Array.from(initialValues.equipmentIds).every(id => currentIdSet.has(id));
        const accessoriesChanged = JSON.stringify(state.localSelectedAccessories) !== JSON.stringify(initialValues.accessories);
        return datesChanged || equipmentChanged || accessoriesChanged;
    }, [state, initialValues]);
    const [isCancelConfirmationVisible, setCancelConfirmationVisible] = useState(false);
    const updateDates = useCallback((newStartDate, newEndDate) => {
        setState(prev => ({ ...prev, startDate: newStartDate, endDate: newEndDate }));
    }, []);
    const addEquipmentItems = useCallback((itemsToAdd) => {
        setState(prev => {
            const currentIds = new Set(prev.currentEquipmentDetails.map(d => d.id));
            const newDetails = itemsToAdd
                .filter(item => !currentIds.has(item.id))
                .map(item => ({ id: item.id, label: createDisplayLabel(item) }));
            if (newDetails.length === 0)
                return prev;
            const newNewlyAddedIds = new Set(prev.newlyAddedEquipmentIds);
            itemsToAdd.forEach(item => {
                if (!initialValues.equipmentIds.has(item.id)) {
                    newNewlyAddedIds.add(item.id);
                }
            });
            return {
                ...prev,
                currentEquipmentDetails: [...prev.currentEquipmentDetails, ...newDetails],
                newlyAddedEquipmentIds: newNewlyAddedIds,
            };
        });
    }, [initialValues.equipmentIds]);
    const removeEquipmentItem = useCallback((idToRemove) => {
        if (state.currentEquipmentDetails.length <= 1) {
            setCancelConfirmationVisible(true);
        }
        else {
            setState(prev => {
                const newDetails = prev.currentEquipmentDetails.filter(eq => eq.id !== idToRemove);
                const newNewlyAddedIds = new Set(prev.newlyAddedEquipmentIds);
                newNewlyAddedIds.delete(idToRemove);
                const newAccessories = { ...prev.localSelectedAccessories };
                delete newAccessories[idToRemove];
                return {
                    ...prev,
                    currentEquipmentDetails: newDetails,
                    newlyAddedEquipmentIds: newNewlyAddedIds,
                    localSelectedAccessories: newAccessories,
                };
            });
        }
    }, [state.currentEquipmentDetails.length]);
    const toggleAccessory = useCallback((equipmentId, accessoryId) => {
        setState(prev => {
            const newAccessoriesState = { ...prev.localSelectedAccessories };
            const currentSelection = newAccessoriesState[equipmentId] || [];
            const isSelected = currentSelection.includes(accessoryId);
            const newSelection = isSelected
                ? currentSelection.filter(id => id !== accessoryId)
                : [...currentSelection, accessoryId];
            if (newSelection.length > 0) {
                newAccessoriesState[equipmentId] = newSelection;
            }
            else {
                delete newAccessoriesState[equipmentId];
            }
            return { ...prev, localSelectedAccessories: newAccessoriesState };
        });
    }, []);
    return {
        // ✨ Возвращаем вычисленное значение hasChanges
        state: { ...state, hasChanges },
        actions: {
            updateDates,
            addEquipmentItems,
            removeEquipmentItem,
            toggleAccessory,
        },
        dialogs: {
            isCancelConfirmationVisible,
            setCancelConfirmationVisible,
        },
    };
}
