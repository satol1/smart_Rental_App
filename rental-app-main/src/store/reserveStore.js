// src/store/reserveStore.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
const isEquipmentSelected = (items, equipmentId) => items.some((item) => item.id === equipmentId);
// Вспомогательная функция для приведения объекта Equipment к единому стандарту
const normalizeEquipment = (equipment) => ({
    id: equipment.id,
    name: equipment.name,
    brand: equipment.brand,
    equipment_type: equipment.equipment_type,
    daily_rate: equipment.daily_rate,
    condition: equipment.condition,
    // Аксессуары важны для расчетов, оставляем их
    accessories: equipment.accessories || [],
    // Все остальные поля (image_url, notes, description и т.д.) намеренно отбрасываются
});
export const useReserveStore = create()(subscribeWithSelector((set, get) => ({
    items: [],
    reservationId: null,
    addToReservationMode: null,
    selectedAccessories: {},
    toggle: (equipment) => {
        const currentItems = get().items;
        const isAlreadySelected = isEquipmentSelected(currentItems, equipment.id);
        if (isAlreadySelected) {
            get().clearAccessoriesForEquipment(equipment.id);
        }
        const newItems = isAlreadySelected
            ? currentItems.filter((item) => item.id !== equipment.id)
            : [...currentItems, normalizeEquipment(equipment)];
        set({ items: newItems });
    },
    add: (equipment) => {
        const currentItems = get().items;
        if (!isEquipmentSelected(currentItems, equipment.id)) {
            set({ items: [...currentItems, normalizeEquipment(equipment)] });
        }
    },
    // 👇 РЕАЛИЗАЦИЯ НОВОГО МЕТОДА
    addWithAccessories: (equipment, accessoryIds) => {
        // ДИАГНОСТИКА: Трассировка структуры объекта Equipment
        console.log("[ReserveStore] addWithAccessories called:");
        console.log("  equipment.id:", equipment.id);
        console.log("  accessoryIds:", accessoryIds);
        console.log("  equipment:", JSON.stringify(equipment, null, 2));
        set(state => {
            const items = state.items.some(i => i.id === equipment.id)
                ? state.items
                : [...state.items, normalizeEquipment(equipment)]; // 👈 Нормализуем здесь
            const newSelectedAccessories = { ...state.selectedAccessories };
            if (accessoryIds.length > 0) {
                newSelectedAccessories[equipment.id] = accessoryIds;
                console.log(`[ReserveStore] Set accessories for equipment ${equipment.id}:`, accessoryIds);
            }
            else {
                delete newSelectedAccessories[equipment.id];
            }
            console.log("[ReserveStore] Final selectedAccessories:", newSelectedAccessories);
            return { items, selectedAccessories: newSelectedAccessories };
        });
    },
    // 👇 РЕАЛИЗАЦИЯ МАССОВОГО ДОБАВЛЕНИЯ
    bulkAddWithAccessories: (items) => {
        // ДИАГНОСТИКА: Трассировка структуры объектов Equipment
        console.log("МАССОВОЕ ДОБАВЛЕНИЕ в reserveStore (bulkAddWithAccessories):", JSON.stringify(items, null, 2));
        set(state => {
            const currentItems = [...state.items];
            const newSelectedAccessories = { ...state.selectedAccessories };
            const currentIds = new Set(currentItems.map(item => item.id));
            items.forEach(({ equipment, accessories }) => {
                if (!currentIds.has(equipment.id)) {
                    // 👈 Нормализуем каждый объект перед добавлением
                    currentItems.push(normalizeEquipment(equipment));
                    currentIds.add(equipment.id);
                }
                if (accessories.length > 0) {
                    const existing = newSelectedAccessories[equipment.id] || [];
                    newSelectedAccessories[equipment.id] = [...new Set([...existing, ...accessories])];
                }
            });
            return { items: currentItems, selectedAccessories: newSelectedAccessories };
        });
    },
    remove: (equipmentId) => {
        get().clearAccessoriesForEquipment(equipmentId);
        set(state => ({
            items: state.items.filter((item) => item.id !== equipmentId)
        }));
    },
    bulkAdd: (equipmentList) => {
        set(state => {
            const currentIds = new Set(state.items.map(item => item.id));
            const newEquipment = equipmentList
                .filter(eq => !currentIds.has(eq.id))
                .map(eq => normalizeEquipment(eq));
            return { items: [...state.items, ...newEquipment] };
        });
    },
    clear: () => {
        set({
            items: [],
            reservationId: null,
            addToReservationMode: null,
            selectedAccessories: {},
        });
    },
    clearItemsOnly: () => {
        set({ items: [], selectedAccessories: {} });
    },
    isSelected: (equipmentId) => isEquipmentSelected(get().items, equipmentId),
    setReservationId: (id) => set({ reservationId: id }),
    setAddToReservationMode: (reservationId) => set({ addToReservationMode: reservationId }),
    completeAddition: () => {
        const state = get();
        const addedItems = [...state.items];
        set({ items: [], addToReservationMode: null, selectedAccessories: {} });
        return addedItems;
    },
    logState: () => {
        console.log(`[ReserveStore] Current state:`, get());
    },
    toggleAccessory: (equipmentId, accessoryId) => {
        set(state => {
            const currentSelection = state.selectedAccessories[equipmentId] || [];
            const isSelected = currentSelection.includes(accessoryId);
            const newSelection = isSelected
                ? currentSelection.filter(id => id !== accessoryId)
                : [...currentSelection, accessoryId];
            const newSelectedAccessories = { ...state.selectedAccessories };
            if (newSelection.length > 0) {
                newSelectedAccessories[equipmentId] = newSelection;
            }
            else {
                delete newSelectedAccessories[equipmentId];
            }
            return { selectedAccessories: newSelectedAccessories };
        });
    },
    isAccessorySelected: (equipmentId, accessoryId) => {
        const selection = get().selectedAccessories[equipmentId];
        return selection ? selection.includes(accessoryId) : false;
    },
    clearAccessoriesForEquipment: (equipmentId) => {
        set(state => {
            if (!state.selectedAccessories[equipmentId]) {
                return state;
            }
            const newSelections = { ...state.selectedAccessories };
            delete newSelections[equipmentId];
            return { selectedAccessories: newSelections };
        });
    }
})));
// Подписки на изменения для отладки (остаются без изменений)
useReserveStore.subscribe((state) => state.items, (items, previousItems) => {
    if (items.length !== previousItems.length) {
        console.log(`[ReserveStore] Items changed: ${previousItems.length} -> ${items.length}`);
    }
});
useReserveStore.subscribe((state) => state.reservationId, (reservationId, previousReservationId) => {
    if (reservationId !== previousReservationId) {
        console.log(`[ReserveStore] Reservation ID changed: ${previousReservationId} -> ${reservationId}`);
    }
});
useReserveStore.subscribe((state) => state.addToReservationMode, (addToReservationMode, previousAddToReservationMode) => {
    if (addToReservationMode !== previousAddToReservationMode) {
        console.log(`[ReserveStore] Add to reservation mode changed: ${previousAddToReservationMode} -> ${addToReservationMode}`);
    }
});
