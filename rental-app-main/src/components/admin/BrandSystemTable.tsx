// src/components/admin/BrandSystemTable.tsx

import { useState, useMemo } from "react";
import { useAdminBrandSystems, useDeleteBrandSystem } from "@/hooks/useAdminBrandSystems";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useTableSort } from "@/hooks/useTableSort";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, ShieldCheck } from "lucide-react";
import BrandSystemDialog from "./BrandSystemDialog";
import type { BrandSystem } from "@/types/brandSystem";

export default function BrandSystemTable() {
    const { data: systems = [], isLoading, isError } = useAdminBrandSystems();
    const { data: allEquipment = [] } = useAllEquipment();
    const deleteMutation = useDeleteBrandSystem();
    
    const [dialogState, setDialogState] = useState<{ isOpen: boolean; system: BrandSystem | null }>({
        isOpen: false,
        system: null
    });
    const [deletingSystem, setDeletingSystem] = useState<BrandSystem | null>(null);

    const { sortedItems, sortColumn, sortDirection, onSort } = useTableSort(systems, {
        name: (system) => system.name,
        count: (system) => system.equipment_ids.length,
    }, { column: "name", direction: "asc" });

    // Преобразуем полный список оборудования в формат для выпадающего меню
    const equipmentOptions = useMemo(() =>
        allEquipment.map(e => ({ value: e.id.toString(), label: e.name })),
        [allEquipment]
    );

    const handleEdit = (system: BrandSystem) => {
        setDialogState({ isOpen: true, system });
    };

    const handleCreate = () => {
        setDialogState({ isOpen: true, system: null });
    };

    const handleDelete = (system: BrandSystem) => {
        setDeletingSystem(system);
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" />
                Загрузка систем брендов...
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-destructive">
                Ошибка загрузки данных систем брендов.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Создать Систему
                </Button>
            </div>

            {sortedItems.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableTableHead column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Название</SortableTableHead>
                            <TableHead>Описание</TableHead>
                            <SortableTableHead column="count" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Кол-во оборудования</SortableTableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedItems.map((system) => (
                            <TableRow key={system.id}>
                                <TableCell className="font-medium">
                                    {system.name}
                                </TableCell>
                                <TableCell>
                                    {system.description || (
                                        <span className="text-muted-foreground italic">Нет описания</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {system.equipment_ids.length}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleEdit(system)}
                                            title="Редактировать"
                                            aria-label="Редактировать бренд"
                                        >
                                            <Edit className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive"
                                            onClick={() => handleDelete(system)}
                                            title="Удалить"
                                            aria-label="Удалить бренд"
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 border-dashed border-2 rounded-lg">
                    <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-2 text-sm font-semibold text-foreground">
                        Системы брендов не созданы
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Нажмите "Создать Систему", чтобы добавить первую систему бренда.
                    </p>
                </div>
            )}

            <BrandSystemDialog
                isOpen={dialogState.isOpen}
                onClose={() => setDialogState({ isOpen: false, system: null })}
                brandSystem={dialogState.system}
                allEquipment={equipmentOptions}
            />

            <ConfirmationDialog
                open={!!deletingSystem}
                onOpenChange={(open) => { if (!open) setDeletingSystem(null); }}
                title="Удалить систему бренда?"
                description={`Система «${deletingSystem?.name ?? ""}» будет удалена безвозвратно.`}
                confirmText="Удалить"
                variant="destructive"
                onConfirm={() => {
                    const system = deletingSystem;
                    setDeletingSystem(null);
                    if (system) deleteMutation.mutate(system.id);
                }}
            />
        </div>
    );
}
