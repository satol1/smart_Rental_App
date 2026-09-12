// src/components/equipment-card/AccessoriesSection.tsx
import React from 'react';
import { Paperclip, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Equipment } from "@/types/equipment";

interface AccessoriesSectionProps {
    equipment: Equipment;
    isExpanded: boolean;
    isDisabled: boolean;
    onToggleExpand: (e: React.MouseEvent) => void;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    isAccessorySelected: (eqId: number, accId: number) => boolean;
}

export const AccessoriesSection: React.FC<AccessoriesSectionProps> = ({
                                                                          equipment, isExpanded, isDisabled, onToggleExpand, onToggleAccessory, isAccessorySelected
                                                                      }) => {
    if (!equipment.accessories?.length) return null;

    return (
        <div className="mt-3 border-t pt-3">
            <button
                className="w-full flex justify-between items-center text-sm font-medium text-muted-foreground hover:text-primary p-1 -m-1 rounded"
                onClick={onToggleExpand}
                aria-expanded={isExpanded}
            >
                <span className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Аксессуары ({equipment.accessories.length})
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="mt-2 space-y-2 pl-1 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    {equipment.accessories.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-1 rounded hover:bg-muted">
                            <Label htmlFor={`acc-${equipment.id}-${acc.id}`} className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                                <Checkbox
                                    id={`acc-${equipment.id}-${acc.id}`}
                                    checked={isAccessorySelected(equipment.id, acc.id)}
                                    onCheckedChange={() => onToggleAccessory(equipment.id, acc.id)}
                                    disabled={isDisabled}
                                />
                                {acc.name}
                            </Label>
                            <span className="text-xs text-muted-foreground">{acc.price} ₽</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};