// src/components/shared/EquipmentWithAccessoriesList.tsx

import { useState } from "react";
import { Paperclip, ChevronDown, MinusCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccessoryLink } from "@/types/reservation";
import type { Equipment } from "@/types/equipment";
import { isEquipmentUnderRepair } from "@/lib/equipmentUtils";

interface EquipmentWithAccessoriesListProps {
    equipment: Equipment[];
    accessoryLinks?: AccessoryLink[];
    title?: string;
    showTitle?: boolean;
    className?: string;
    showRemoveButton?: boolean;
    onRemoveItem?: (equipmentId: number) => void;
    isRemoveDisabled?: boolean;
    removeButtonTitle?: string;
}

export default function EquipmentWithAccessoriesList({
    equipment,
    accessoryLinks = [],
    title = "Состав резерва:",
    showTitle = true,
    className = "",
    showRemoveButton = false,
    onRemoveItem,
    isRemoveDisabled = false,
    removeButtonTitle = "Удалить из резерва"
}: EquipmentWithAccessoriesListProps) {
    const [expandedAccessories, setExpandedAccessories] = useState<Record<number, boolean>>({});

    // Логирование для отладки отсутствующих аксессуаров
    const missingAccessories = accessoryLinks.filter(link => !link.accessory);
    if (missingAccessories.length > 0) {
        console.warn('Обнаружены AccessoryLink с отсутствующими accessory:', missingAccessories);
    }

    const toggleAccessories = (equipmentId: number) => {
        setExpandedAccessories(prev => ({
            ...prev,
            [equipmentId]: !prev[equipmentId]
        }));
    };

    if (equipment.length === 0) {
        return (
            <div className={`space-y-2 pt-2 border-t ${className}`}>
                {showTitle && (
                    <h4 className="font-medium text-sm text-gray-800">{title}</h4>
                )}
                <div className="text-sm text-gray-500 italic">Нет оборудования в резерве</div>
            </div>
        );
    }

    return (
        <div className={`space-y-2 pt-2 border-t ${className}`}>
            {showTitle && (
                <h4 className="font-medium text-sm text-gray-800">{title}</h4>
            )}
            <div className="space-y-2">
                {equipment.map((item) => {
                    // Фильтруем аксессуары, чтобы убедиться, что данные о них существуют
                    const accessoriesForItem = accessoryLinks.filter(link => 
                        link.equipment_id === item.id && link.accessory
                    );
                    
                    return (
                        <div key={item.id} className="text-sm text-gray-700 bg-gray-50/70 p-2 rounded-md border">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <p>• {item.name}</p>
                                    {isEquipmentUnderRepair(item) && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>временно недоступно</span>
                                        </div>
                                    )}
                                </div>
                                {showRemoveButton && onRemoveItem && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onRemoveItem(item.id)}
                                        className={`hover:text-rose-700 ${
                                            isRemoveDisabled ? "text-gray-400 cursor-not-allowed" : "text-rose-500"
                                        }`}
                                        title={removeButtonTitle}
                                        aria-label="Удалить оборудование"
                                        disabled={isRemoveDisabled}
                                    >
                                        <MinusCircle className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                            {accessoriesForItem.length > 0 && (
                                <div className="mt-2 pl-4">
                                    <button 
                                        onClick={() => toggleAccessories(item.id)} 
                                        className="flex items-center text-xs text-sky-700 hover:underline font-medium"
                                    >
                                        <Paperclip className="w-3 h-3 mr-1" />
                                        Аксессуары ({accessoriesForItem.length})
                                        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${expandedAccessories[item.id] ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedAccessories[item.id] && (
                                        <ul className="list-disc list-inside text-xs text-gray-600 mt-1 pl-2 animate-in fade-in duration-200">
                                            {accessoriesForItem.map(link => {
                                                // Дополнительная защита на случай, если accessory стал null после фильтрации
                                                if (!link.accessory) {
                                                    console.warn('Обнаружен AccessoryLink с отсутствующим accessory:', link);
                                                    return null;
                                                }
                                                return (
                                                    <li key={link.accessory.id}>{link.accessory.name}</li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
