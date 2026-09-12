// src/components/admin/EquipmentTable.tsx


import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useTableSort } from "@/hooks/useTableSort";
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
        pendingDelete,
        cancelDelete,
        confirmDelete,
        pendingBulkDeleteCount,
        cancelBulkDelete,
        confirmBulkDelete,
    } = useEquipmentTableLogic(equipment);

    const { sortedItems, sortColumn, sortDirection, onSort } = useTableSort(filteredEquipment, {
        type: (item) => item.equipment_type,
        brand: (item) => item.brand,
        name: (item) => item.name,
        serial: (item) => item.serial_number ?? null,
        condition: (item) => item.condition,
        rate: (item) => item.daily_rate,
    });

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

            {sortedItems.length > 0 ? (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {isManager && <TableHead className="w-12"></TableHead>}
                                <SortableTableHead column="type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}><Package className="inline mr-2 h-4 w-4" />Тип</SortableTableHead>
                                <SortableTableHead column="brand" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Бренд</SortableTableHead>
                                <SortableTableHead column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Название</SortableTableHead>
                                <SortableTableHead column="serial" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Серийный номер</SortableTableHead>
                                <SortableTableHead column="condition" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Состояние</SortableTableHead>
                                <SortableTableHead column="rate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Тариф/день</SortableTableHead>
                                {isManager && <TableHead>Действия</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.map((item) => (
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

            <ConfirmationDialog
                open={!!pendingDelete}
                onOpenChange={(open) => { if (!open) cancelDelete(); }}
                title="Удалить оборудование?"
                description={`«${pendingDelete?.name ?? ""}» будет удалено безвозвратно. Действие нельзя отменить.`}
                confirmText="Удалить"
                variant="destructive"
                onConfirm={confirmDelete}
            />

            <ConfirmationDialog
                open={pendingBulkDeleteCount != null}
                onOpenChange={(open) => { if (!open) cancelBulkDelete(); }}
                title="Удалить выбранное оборудование?"
                description={`Будет удалено позиций: ${pendingBulkDeleteCount ?? 0}. Действие нельзя отменить.`}
                confirmText="Удалить"
                variant="destructive"
                onConfirm={confirmBulkDelete}
            />

        </div>
    );
}
