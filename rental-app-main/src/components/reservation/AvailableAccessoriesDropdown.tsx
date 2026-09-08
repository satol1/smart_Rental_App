// src/components/reservation/AvailableAccessoriesDropdown.tsx

import { useState } from 'react';
import { Paperclip, ChevronDown, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Accessory } from '@/types/accessory';

interface Props {
    accessories: Accessory[];
    equipmentId: number;
    onToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    disabled?: boolean;
    hasTopBorder: boolean;
}

export const AvailableAccessoriesDropdown = ({ accessories, equipmentId, onToggleAccessory, disabled, hasTopBorder }: Props) => {
    const [isExpanded, setExpanded] = useState(false);

    if (accessories.length === 0) {
        return null;
    }

    return (
        <div className={`pt-2 mt-2 ${hasTopBorder ? 'border-t' : ''}`}>
            <button
                className="w-full flex justify-between items-center text-sm font-medium text-muted-foreground hover:text-primary p-1 -m-1 rounded"
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
                aria-expanded={isExpanded}
                disabled={disabled}
            >
                <span className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Добавить аксессуары ({accessories.length})
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
                <div className="mt-2 space-y-1 pl-1 ">
                    {accessories.map(acc => (
                        <div key={acc.id} className="flex items-center justify-between p-1 rounded hover:bg-muted">
                            <span className="text-xs font-normal">
                                {acc.name} ({acc.price} ₽)
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => onToggleAccessory(equipmentId, acc.id)}
                                disabled={disabled}
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                                Добавить
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
