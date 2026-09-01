// src/components/admin/EquipmentTableRow.tsx

import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Copy } from "lucide-react";
import type { Equipment } from "@/types/equipment";
import { getConditionVariantClass } from "@/constants/equipmentConstants";

interface Props {
    item: Equipment;
    isSelected: boolean;
    isManager: boolean;
    isDeleting: boolean;
    onSelectItem: (id: number, checked: boolean) => void;
    onEdit: (item: Equipment) => void;
    onDelete: (id: number) => void;
    onCopy: (item: Equipment) => void;
}

export const EquipmentTableRow = ({ item, isSelected, isManager, isDeleting, onSelectItem, onEdit, onDelete, onCopy }: Props) => (
    <TableRow>
        {isManager && (
            <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectItem(item.id, Boolean(checked))}
                />
            </TableCell>
        )}
        <TableCell className="font-medium">{item.equipment_type}</TableCell>
        <TableCell>{item.brand}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.serial_number || "—"}</TableCell>
        <TableCell>
            {/* ✅ ИЗМЕНЕНИЕ: Используем импортированную функцию */}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConditionVariantClass(item.condition)}`}>
                {item.condition}
            </span>
        </TableCell>
        <TableCell className="font-medium">{item.daily_rate.toLocaleString()} ₽</TableCell>
        {isManager && (
            <TableCell>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => onEdit(item)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => onCopy(item)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => onDelete(item.id)} disabled={isDeleting}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        )}
    </TableRow>
);