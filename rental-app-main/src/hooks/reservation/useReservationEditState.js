// src/hooks/reservation/useReservationEditState.ts
import { useState, useMemo, useCallback, useEffect } from "react";
import { useReserveStore } from "@/store/reserveStore";
import { useAllEquipment } from "@/hooks/useAllEquipment";
function createDisplayLabel(equipmentItem) {
    return `${equipmentItem.equipment_type} ${equipmentItem.brand} ${equipmentItem.name}`;
}
export function useReservationEditState(reservation, initialEquipmentForDisplay) {
    const { data: allEquipment = [] } = useAllEquipment();
    const { clear: clearReserveStore, items: itemsFromStore, selectedAccessories: selectedAccessoriesFromStore } = useReserveStore();
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
        hasProcessedEquipmentAddition: false,
        holidayConflict: null,
    });
    // Вычисляем hasChanges через useMemo
    const hasChanges = useMemo(() => {
        const datesChanged = state.startDate.getTime() !== initialValues.startDate.getTime() ||
            state.endDate.getTime() !== initialValues.endDate.getTime();
        const currentIdSet = new Set(state.currentEquipmentDetails.map(eq => eq.id));
        const equipmentChanged = initialValues.equipmentIds.size !== currentIdSet.size ||
            !Array.from(initialValues.equipmentIds).every(id => currentIdSet.has(id));
        const accessoriesChanged = JSON.stringify(state.localSelectedAccessories) !== JSON.stringify(initialValues.accessories);
        return datesChanged || equipmentChanged || accessoriesChanged;
    }, [state, initialValues]);
    // Обработка добавления оборудования из reserveStore
    useEffect(() => {
        const { addToReservationMode } = useReserveStore.getState();
        console.log("🔧 [useReservationEditState] Проверка добавления оборудования:", {
            addToReservationMode,
            reservationId: reservation.id,
            itemsFromStoreLength: itemsFromStore.length,
            hasProcessedEquipmentAddition: state.hasProcessedEquipmentAddition,
            allEquipmentLength: allEquipment.length
        });
        if (addToReservationMode === reservation.id && itemsFromStore.length > 0 && !state.hasProcessedEquipmentAddition) {
            if (allEquipment.length > 0) {
                console.log("🔧 [useReservationEditState] Добавляем оборудование:", {
                    itemsFromStore: itemsFromStore.map(item => ({ id: item.id, name: item.name })),
                    allEquipmentLength: allEquipment.length
                });
                const newItemsData = itemsFromStore.map(itemInStore => allEquipment.find((eq) => eq.id === itemInStore.id) || itemInStore);
                console.log("🔧 [useReservationEditState] Данные для добавления:", newItemsData.map(item => ({ id: item.id, name: item.name })));
                console.log("🔧 [useReservationEditState] Аксессуары из стора:", selectedAccessoriesFromStore);
                addEquipmentItems(newItemsData);
                // 🔧 ИСПРАВЛЕНИЕ: Переносим аксессуары из стора в локальное состояние
                if (Object.keys(selectedAccessoriesFromStore).length > 0) {
                    console.log("🔧 [useReservationEditState] Переносим аксессуары в локальное состояние");
                    setState(prev => ({
                        ...prev,
                        localSelectedAccessories: {
                            ...prev.localSelectedAccessories,
                            ...selectedAccessoriesFromStore
                        },
                        hasProcessedEquipmentAddition: true
                    }));
                }
                else {
                    setState(prev => ({ ...prev, hasProcessedEquipmentAddition: true }));
                }
                console.log("🔧 [useReservationEditState] Оборудование и аксессуары добавлены, hasProcessedEquipmentAddition установлен в true");
            }
        }
    }, [allEquipment, reservation.id, itemsFromStore, selectedAccessoriesFromStore, state.hasProcessedEquipmentAddition]);
    const updateDates = useCallback((newStartDate, newEndDate) => {
        setState(prev => ({ ...prev, startDate: newStartDate, endDate: newEndDate }));
    }, []);
    const addEquipmentItems = useCallback((itemsToAdd) => {
        console.log("🔧 [addEquipmentItems] Вызывается с данными:", itemsToAdd.map(item => ({ id: item.id, name: item.name })));
        setState(prev => {
            console.log("🔧 [addEquipmentItems] Текущее состояние:", {
                currentEquipmentDetails: prev.currentEquipmentDetails.map(eq => ({ id: eq.id, label: eq.label })),
                newlyAddedEquipmentIds: Array.from(prev.newlyAddedEquipmentIds),
                originalEquipmentIds: Array.from(initialValues.equipmentIds)
            });
            const currentIds = new Set(prev.currentEquipmentDetails.map(d => d.id));
            const newDetails = itemsToAdd
                .filter(item => !currentIds.has(item.id))
                .map(item => ({ id: item.id, label: createDisplayLabel(item) }));
            console.log("🔧 [addEquipmentItems] Новые детали для добавления:", newDetails);
            if (newDetails.length === 0) {
                console.log("🔧 [addEquipmentItems] Нет новых элементов для добавления");
                return prev;
            }
            const newNewlyAddedIds = new Set(prev.newlyAddedEquipmentIds);
            itemsToAdd.forEach(item => {
                if (!initialValues.equipmentIds.has(item.id)) {
                    newNewlyAddedIds.add(item.id);
                }
            });
            const newState = {
                ...prev,
                currentEquipmentDetails: [...prev.currentEquipmentDetails, ...newDetails],
                newlyAddedEquipmentIds: newNewlyAddedIds,
            };
            console.log("🔧 [addEquipmentItems] Новое состояние:", {
                currentEquipmentDetails: newState.currentEquipmentDetails.map(eq => ({ id: eq.id, label: eq.label })),
                newlyAddedEquipmentIds: Array.from(newState.newlyAddedEquipmentIds)
            });
            return newState;
        });
    }, [initialValues.equipmentIds]);
    const removeEquipmentItem = useCallback((idToRemove) => {
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
    }, []);
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
    const setHolidayConflict = useCallback((conflict) => {
        setState(prev => ({ ...prev, holidayConflict: conflict }));
    }, []);
    const resetProcessedEquipmentAddition = useCallback(() => {
        setState(prev => ({ ...prev, hasProcessedEquipmentAddition: false }));
    }, []);
    const clearReserveStoreAndReset = useCallback(() => {
        clearReserveStore();
        setState(prev => ({ ...prev, hasProcessedEquipmentAddition: false }));
    }, [clearReserveStore]);
    return {
        state: { ...state, hasChanges },
        actions: {
            updateDates,
            addEquipmentItems,
            removeEquipmentItem,
            toggleAccessory,
            setHolidayConflict,
            resetProcessedEquipmentAddition,
            clearReserveStoreAndReset,
        },
        allEquipment,
        clearReserveStore,
    };
}
