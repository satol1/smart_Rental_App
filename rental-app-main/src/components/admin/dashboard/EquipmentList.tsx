// src/components/admin/dashboard/EquipmentList.tsx

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface EquipmentListProps {
    equipmentList: string[];
    maxVisible?: number;
}

export default function EquipmentList({ equipmentList, maxVisible = 3 }: EquipmentListProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Показываем только первые maxVisible элементов оборудования
    const visibleEquipment = isExpanded ? equipmentList : equipmentList.slice(0, maxVisible);
    const hasMoreEquipment = equipmentList.length > maxVisible;

    if (equipmentList.length === 0) {
        return (
            <div className="mt-2 pt-2 border-t">
                <p className="text-xs font-semibold mb-1">Оборудование:</p>
                <p className="text-xs text-gray-500">Нет оборудования</p>
            </div>
        );
    }

    return (
        <div className="mt-2 pt-2 border-t">
            <p className="text-xs font-semibold mb-1">Оборудование:</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
                {visibleEquipment.map((eq, index) => (
                    <li key={index}>{eq}</li>
                ))}
            </ul>
            {hasMoreEquipment && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3 h-3" />
                            Свернуть
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3" />
                            Показать еще {equipmentList.length - maxVisible}
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
