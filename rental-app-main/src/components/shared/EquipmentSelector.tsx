// src/components/shared/EquipmentSelector.tsx

import { useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ChevronRight } from "lucide-react";
import type { Equipment } from "@/types/equipment";
import type { AvailabilityInfo } from "@/types/availability";
import ConflictIndicator from "./ConflictIndicator";
import { cn } from "@/lib/utils";

interface EquipmentSelectorProps {
  // Основные пропсы
  name: string;
  control: any; // UseFormReturn<any>['control']
  label: string;
  
  // Данные
  equipment: Equipment[];
  availabilityMap: Record<number, AvailabilityInfo>;
  isLoading: boolean;
  
  // Поиск
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Валидация и ошибки
  error?: string;
  
  // Состояние
  disabled?: boolean;
  
  // Стилизация
  className?: string;
}

/**
 * Переиспользуемый компонент для выбора оборудования с группировкой по типам и брендам.
 * Показывает конфликты доступности и поддерживает поиск.
 */
export default function EquipmentSelector({
  name,
  control,
  label,
  equipment,
  availabilityMap,
  isLoading,
  searchQuery,
  onSearchChange,
  error,
  disabled = false,
  className
}: EquipmentSelectorProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Группируем оборудование по типам и брендам
  const groupedEquipment = equipment.reduce((acc, item) => {
    if (!acc[item.equipment_type]) {
      acc[item.equipment_type] = {};
    }
    if (!acc[item.equipment_type][item.brand]) {
      acc[item.equipment_type][item.brand] = [];
    }
    acc[item.equipment_type][item.brand].push(item);
    return acc;
  }, {} as Record<string, Record<string, Equipment[]>>);

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Поиск..." 
          value={searchQuery} 
          onChange={(e) => onSearchChange(e.target.value)} 
          className="pl-10" 
          disabled={disabled}
        />
      </div>
      
      <div className="rounded-md border">
        {isLoading ? (
          <p className="text-center py-4">Загрузка...</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <div className="space-y-3">
                    {Object.keys(groupedEquipment).map(type => {
                      const isTypeCollapsed = collapsedSections[type];
                      return (
                        <div key={type}>
                          <button 
                            type="button" 
                            onClick={() => toggleSection(type)} 
                            className="w-full flex items-center gap-1 font-semibold text-md sticky top-0 bg-white/80 backdrop-blur-sm py-1 cursor-pointer z-10"
                          >
                            <ChevronRight className={cn(
                              "w-4 h-4 transition-transform", 
                              !isTypeCollapsed && "rotate-90"
                            )} />
                            {type}
                          </button>
                          
                          {!isTypeCollapsed && Object.keys(groupedEquipment[type]).map(brand => {
                            const brandKey = `${type}-${brand}`;
                            const isBrandCollapsed = collapsedSections[brandKey];
                            return (
                              <div key={brandKey} className="pl-4">
                                <button 
                                  type="button" 
                                  onClick={() => toggleSection(brandKey)} 
                                  className="w-full flex items-center gap-1 font-medium text-sm text-gray-600 hover:text-black"
                                >
                                  <ChevronRight className={cn(
                                    "w-4 h-4 transition-transform", 
                                    !isBrandCollapsed && "rotate-90"
                                  )} />
                                  {brand}
                                </button>
                                
                                {!isBrandCollapsed && (
                                  <div className="space-y-1 pl-4 border-l ml-2 py-1">
                                    {groupedEquipment[type][brand].map(item => {
                                      const availability = availabilityMap[item.id];
                                      const hasConflict = availability && availability.status !== 'available';
                                      
                                      return (
                                        <div 
                                          key={item.id} 
                                          className={cn(
                                            "p-2 rounded-md transition-colors",
                                            hasConflict && (availability.status === 'rented' ? 'bg-red-100' : 'bg-amber-100'),
                                            !hasConflict && "hover:bg-gray-50"
                                          )}
                                        >
                                          <div className="flex items-center gap-3">
                                            <Checkbox 
                                              id={`eq-${item.id}`} 
                                              checked={field.value?.includes(item.id) || false} 
                                              onCheckedChange={(checked) => {
                                                const currentIds = field.value || [];
                                                const newIds = checked 
                                                  ? [...currentIds, item.id] 
                                                  : currentIds.filter((id: number) => id !== item.id);
                                                field.onChange(newIds);
                                              }}
                                              disabled={disabled}
                                            />
                                            <Label 
                                              htmlFor={`eq-${item.id}`} 
                                              className="font-normal w-full cursor-pointer text-sm"
                                            >
                                              {item.brand} {item.name}
                                            </Label>
                                          </div>
                                          
                                          {hasConflict && (
                                            <div className="mt-1 pl-8">
                                              <ConflictIndicator 
                                                availability={availability} 
                                                variant="block"
                                                showDetails={true}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          </ScrollArea>
        )}
      </div>
      
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
