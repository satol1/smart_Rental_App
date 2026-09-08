// src/hooks/features/useCalendarFilters.ts
import { useState, useEffect } from 'react';
import { useCoreFilteringLogic } from './useCoreFilteringLogic';
export function useCalendarFilters({ allEquipment }) {
    // Состояния фильтров
    const [typeFilter, setTypeFilter] = useState(null);
    const [brandFilter, setBrandFilter] = useState(null);
    const [searchText, setSearchText] = useState("");
    // Используем централизованную логику фильтрации
    const { availableTypes, availableBrands } = useCoreFilteringLogic({
        allEquipment,
        allAssociations: [], // Календарь не использует ассоциации
        filters: {
            type: typeFilter,
            brand: brandFilter,
            query: searchText
        }
    });
    // Сброс brandFilter, если он становится невалидным после изменения typeFilter
    useEffect(() => {
        if (brandFilter && !availableBrands.includes(brandFilter)) {
            setBrandFilter(null);
        }
    }, [brandFilter, availableBrands]);
    // Сброс typeFilter, если он становится невалидным после изменения brandFilter
    useEffect(() => {
        if (typeFilter && !availableTypes.includes(typeFilter)) {
            setTypeFilter(null);
        }
    }, [typeFilter, availableTypes]);
    // Функция сброса всех фильтров
    const resetFilters = () => {
        setTypeFilter(null);
        setBrandFilter(null);
        setSearchText("");
    };
    return {
        // Состояния
        typeFilter,
        brandFilter,
        searchText,
        // Сеттеры
        setTypeFilter,
        setBrandFilter,
        setSearchText,
        // Вычисленные массивы
        availableTypes,
        availableBrands,
        // Функция сброса
        resetFilters,
    };
}
