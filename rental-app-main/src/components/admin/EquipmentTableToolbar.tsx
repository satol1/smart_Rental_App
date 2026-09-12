// src/components/admin/EquipmentTableToolbar.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Trash2 } from "lucide-react";

interface Props {
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onAdd?: () => void;
    onBulkDelete: () => void;
    selectedCount: number;
    totalCount: number;
    filteredCount: number;
    isManager: boolean;
    isDeleting: boolean;
}

export const EquipmentTableToolbar = ({
                                          searchQuery,
                                          onSearchChange,
                                          onAdd,
                                          onBulkDelete,
                                          selectedCount,
                                          totalCount,
                                          filteredCount,
                                          isManager,
                                          isDeleting
                                      }: Props) => (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Поиск по названию, бренду, типу..."
                aria-label="Поиск оборудования по названию, бренду или типу"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
            />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
            <span className="text-sm text-muted-foreground text-center sm:text-left">
                Найдено: {filteredCount} из {totalCount}
            </span>
            {selectedCount > 0 && isManager && (
                <Button variant="destructive" size="sm" onClick={onBulkDelete} disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить ({selectedCount})
                </Button>
            )}
            {isManager && onAdd && (
                <Button onClick={onAdd} size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить оборудование
                </Button>
            )}
        </div>
    </div>
);