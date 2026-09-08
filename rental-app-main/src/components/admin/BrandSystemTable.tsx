// src/components/admin/BrandSystemTable.tsx

import { useState, useMemo } from "react";
import { useAdminBrandSystems, useDeleteBrandSystem } from "@/hooks/useAdminBrandSystems";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { Button } from "@/components/ui/button";
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

    const handleDelete = (id: number) => {
        if (window.confirm("Удалить систему бренда? Это действие нельзя отменить.")) {
            deleteMutation.mutate(id);
        }
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
            <p className="text-red-500">
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

            {systems.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Название</TableHead>
                            <TableHead>Описание</TableHead>
                            <TableHead>Кол-во оборудования</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {systems.map((system) => (
                            <TableRow key={system.id}>
                                <TableCell className="font-medium">
                                    {system.name}
                                </TableCell>
                                <TableCell>
                                    {system.description || (
                                        <span className="text-gray-400 italic">Нет описания</span>
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
                                            className="text-red-500 hover:text-red-700" 
                                            onClick={() => handleDelete(system.id)}
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
                    <ShieldCheck className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-800">
                        Системы брендов не созданы
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
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
        </div>
    );
}
