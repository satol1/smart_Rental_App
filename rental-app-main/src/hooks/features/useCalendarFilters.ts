// src/hooks/features/useCalendarFilters.ts

import { useState, useEffect } from 'react';
import { useCoreFilteringLogic } from './useCoreFilteringLogic';
import type { Equipment } from '@/types/equipment';

interface UseCalendarFiltersProps {
  allEquipment: Equipment[];
}

interface UseCalendarFiltersReturn {
  // Состояния
  typeFilter: string | null;
  brandFilter: string | null;
  searchText: string;
  
  // Сеттеры
  setTypeFilter: (value: string | null) => void;
  setBrandFilter: (value: string | null) => void;
  setSearchText: (value: string) => void;
  
  // Вычисленные массивы
  availableTypes: string[];
  availableBrands: string[];
  
  // Функция сброса
  resetFilters: () => void;
}

export function useCalendarFilters({ allEquipment }: UseCalendarFiltersProps): UseCalendarFiltersReturn {
  // Состояния фильтров
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

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
