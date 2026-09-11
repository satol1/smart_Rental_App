// src/components/admin/EquipmentTable.tsx


import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, PackageSearch } from "lucide-react";
import { useEquipmentTableLogic } from "@/hooks/admin/useEquipmentTableLogic";
import { EquipmentTableToolbar } from "./EquipmentTableToolbar";
import { EquipmentTableRow } from "./EquipmentTableRow";
import { EquipmentStats } from "./EquipmentStats";
import type { Equipment } from "@/types/equipment";

interface EquipmentTableProps {
    onEditEquipment?: (equipment: Equipment) => void;
    onCopyEquipment?: (equipment: Equipment) => void;
    equipment: Equipment[];
}

export default function EquipmentTable({
                                           onEditEquipment,
                                           onCopyEquipment,
                                           equipment
                                       }: EquipmentTableProps) {

    const {
        isManager,
        isLoading,
        error,
        filteredEquipment,
        searchQuery,
        selectedIds,
        deleteEquipmentMutation,
        bulkDeleteMutation,
        handlers,
    } = useEquipmentTableLogic(equipment);

    if (isLoading) return <div className="flex justify-center p-4">Загрузка оборудования...</div>;
    if (error) return <div className="flex justify-center p-4 text-destructive">Ошибка загрузки оборудования</div>;

    return (
        <div className="space-y-4">
            <EquipmentTableToolbar
                searchQuery={searchQuery}
                onSearchChange={handlers.setSearchQuery}
                onBulkDelete={handlers.handleBulkDelete}
                selectedCount={selectedIds.length}
                totalCount={equipment.length}
                filteredCount={filteredEquipment.length}
                isManager={isManager}
                isDeleting={bulkDeleteMutation.isPending}
            />

            {filteredEquipment.length > 0 ? (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {isManager && <TableHead className="w-12"></TableHead>}
                                <TableHead><Package className="inline mr-2 h-4 w-4" />Тип</TableHead>
                                <TableHead>Бренд</TableHead>
                                <TableHead>Название</TableHead>
                                <TableHead>Серийный номер</TableHead>
                                <TableHead>Состояние</TableHead>
                                <TableHead>Тариф/день</TableHead>
                                {isManager && <TableHead>Действия</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEquipment.map((item) => (
                                <EquipmentTableRow
                                    key={item.id}
                                    item={item}
                                    isSelected={selectedIds.includes(item.id)}
                                    isManager={isManager}
                                    isDeleting={deleteEquipmentMutation.isPending}
                                    onSelectItem={handlers.handleSelectItem}
                                    onEdit={onEditEquipment!}
                                    onCopy={onCopyEquipment!}
                                    onDelete={handlers.handleDelete}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 px-4 border rounded-md">
                    <PackageSearch className="w-16 h-16 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Оборудование не найдено</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {searchQuery ? "Попробуйте изменить поисковый запрос." : "Добавьте оборудование, чтобы оно появилось в списке."}
                    </p>
                </div>
            )}


            <EquipmentStats equipment={equipment} />

        </div>
    );
}