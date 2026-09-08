// src/hooks/features/useCoreFilteringLogic.ts
import { useMemo } from 'react';
/**
 * Централизованная логика фильтрации оборудования.
 *
 * Этот хук содержит всю логику фильтрации, которая ранее дублировалась
 * в useSmartFilters и useCalendarFilters. Он является "чистым" хуком,
 * который не зависит от внешних хранилищ состояний.
 *
 * Логика работы:
 * 1. Применяет все активные фильтры к списку оборудования
 * 2. Вычисляет доступные опции для каждого типа фильтра
 * 3. Определяет наличие активных фильтров
 */
export function useCoreFilteringLogic({ allEquipment, allAssociations, filters }) {
    const { type, brand, associationId, query } = filters;
    // Основная логика фильтрации с кешированием
    const filteredEquipment = useMemo(() => {
        let filtered = [...allEquipment];
        // 1. Фильтрация по поисковому запросу
        if (query && query.trim()) {
            const searchQuery = query.toLowerCase().trim();
            filtered = filtered.filter(equipment => equipment.name.toLowerCase().includes(searchQuery) ||
                equipment.brand.toLowerCase().includes(searchQuery) ||
                equipment.equipment_type.toLowerCase().includes(searchQuery) ||
                equipment.description?.toLowerCase().includes(searchQuery) ||
                equipment.serial_number?.toLowerCase().includes(searchQuery));
        }
        // 2. Фильтрация по ассоциации
        if (associationId) {
            const association = allAssociations.find(a => a.id === associationId);
            if (association && association.equipment_ids.length > 0) {
                filtered = filtered.filter(equipment => association.equipment_ids.includes(equipment.id));
            }
            else {
                // Если ассоциация не найдена или пустая, показываем пустой результат
                filtered = [];
            }
        }
        // 3. Фильтрация по типу
        if (type) {
            filtered = filtered.filter(equipment => equipment.equipment_type === type);
        }
        // 4. Фильтрация по бренду
        if (brand && brand !== "__all__") {
            filtered = filtered.filter(equipment => equipment.brand === brand);
        }
        return filtered;
    }, [allEquipment, allAssociations, query, associationId, type, brand]);
    // Вычисляем доступные типы на основе текущих фильтров
    const availableTypes = useMemo(() => {
        let equipmentForTypes = [...allEquipment];
        // Применяем фильтры, исключая фильтр по типу
        if (query && query.trim()) {
            const searchQuery = query.toLowerCase().trim();
            equipmentForTypes = equipmentForTypes.filter(equipment => equipment.name.toLowerCase().includes(searchQuery) ||
                equipment.brand.toLowerCase().includes(searchQuery) ||
                equipment.equipment_type.toLowerCase().includes(searchQuery) ||
                equipment.description?.toLowerCase().includes(searchQuery) ||
                equipment.serial_number?.toLowerCase().includes(searchQuery));
        }
        if (associationId) {
            const association = allAssociations.find(a => a.id === associationId);
            if (association && association.equipment_ids.length > 0) {
                equipmentForTypes = equipmentForTypes.filter(equipment => association.equipment_ids.includes(equipment.id));
            }
            else {
                equipmentForTypes = [];
            }
        }
        if (brand && brand !== "__all__") {
            equipmentForTypes = equipmentForTypes.filter(equipment => equipment.brand === brand);
        }
        // Извлекаем уникальные типы
        const uniqueTypes = new Set(equipmentForTypes.map(equipment => equipment.equipment_type));
        return Array.from(uniqueTypes).sort();
    }, [allEquipment, allAssociations, query, associationId, brand]);
    // Вычисляем доступные бренды на основе текущих фильтров
    const availableBrands = useMemo(() => {
        let equipmentForBrands = [...allEquipment];
        // Применяем фильтры, исключая фильтр по бренду
        if (query && query.trim()) {
            const searchQuery = query.toLowerCase().trim();
            equipmentForBrands = equipmentForBrands.filter(equipment => equipment.name.toLowerCase().includes(searchQuery) ||
                equipment.brand.toLowerCase().includes(searchQuery) ||
                equipment.equipment_type.toLowerCase().includes(searchQuery) ||
                equipment.description?.toLowerCase().includes(searchQuery) ||
                equipment.serial_number?.toLowerCase().includes(searchQuery));
        }
        if (associationId) {
            const association = allAssociations.find(a => a.id === associationId);
            if (association && association.equipment_ids.length > 0) {
                equipmentForBrands = equipmentForBrands.filter(equipment => association.equipment_ids.includes(equipment.id));
            }
            else {
                equipmentForBrands = [];
            }
        }
        if (type) {
            equipmentForBrands = equipmentForBrands.filter(equipment => equipment.equipment_type === type);
        }
        // Извлекаем уникальные бренды
        const uniqueBrands = new Set(equipmentForBrands.map(equipment => equipment.brand));
        return Array.from(uniqueBrands).sort();
    }, [allEquipment, allAssociations, query, associationId, type]);
    // Вычисляем доступные ассоциации на основе текущих фильтров
    const availableAssociations = useMemo(() => {
        let equipmentForAssociations = [...allEquipment];
        // Применяем фильтры, исключая фильтр по ассоциации
        if (query && query.trim()) {
            const searchQuery = query.toLowerCase().trim();
            equipmentForAssociations = equipmentForAssociations.filter(equipment => equipment.name.toLowerCase().includes(searchQuery) ||
                equipment.brand.toLowerCase().includes(searchQuery) ||
                equipment.equipment_type.toLowerCase().includes(searchQuery) ||
                equipment.description?.toLowerCase().includes(searchQuery) ||
                equipment.serial_number?.toLowerCase().includes(searchQuery));
        }
        if (type) {
            equipmentForAssociations = equipmentForAssociations.filter(equipment => equipment.equipment_type === type);
        }
        if (brand && brand !== "__all__") {
            equipmentForAssociations = equipmentForAssociations.filter(equipment => equipment.brand === brand);
        }
        // Получаем ID оборудования, которое соответствует текущим фильтрам
        const filteredEquipmentIds = new Set(equipmentForAssociations.map(equipment => equipment.id));
        // Фильтруем ассоциации, оставляя только те, которые содержат оборудование из отфильтрованного списка
        const relevantAssociations = allAssociations.filter(association => association.equipment_ids.some(equipmentId => filteredEquipmentIds.has(equipmentId)));
        return relevantAssociations.sort((a, b) => a.sort_order - b.sort_order);
    }, [allEquipment, allAssociations, query, type, brand]);
    // Определяем наличие активных фильтров
    const hasActiveFilters = useMemo(() => {
        return !!((query && query.trim()) ||
            type ||
            (brand && brand !== "__all__") ||
            associationId);
    }, [query, type, brand, associationId]);
    return {
        filteredEquipment,
        availableTypes,
        availableBrands,
        availableAssociations,
        hasActiveFilters,
    };
}
