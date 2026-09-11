// src/components/admin/PackTable.tsx

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Edit, Trash2, Loader2, PackageSearch } from "lucide-react";
import { useAdminPacks, useDeletePack } from "@/hooks/useAdminPacks";
import PackDialog from "./PackDialog";
import type { Pack } from "@/types/pack";

export default function PackTable() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingPack, setEditingPack] = useState<Pack | null>(null);
    
    const { data: packs, isLoading, error } = useAdminPacks();
    const deletePackMutation = useDeletePack();

    const handleEdit = (pack: Pack) => {
        setEditingPack(pack);
    };

    const handleDelete = async (packId: number) => {
        if (window.confirm("Вы уверены, что хотите удалить эту пачку?")) {
            await deletePackMutation.mutateAsync(packId);
        }
    };

    const handleCloseDialog = () => {
        setShowCreateDialog(false);
        setEditingPack(null);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Загрузка пачек...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 px-4 border rounded-md">
                <PackageSearch className="w-16 h-16 text-destructive/40 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-destructive">Ошибка загрузки</h3>
                <p className="text-sm text-destructive">
                    Не удалось загрузить список пачек. Попробуйте обновить страницу.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Заголовок и кнопка создания */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Список пачек
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Всего пачек: {packs?.length || 0}
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <PackagePlus className="w-4 h-4 mr-2" />
                    Создать новую пачку
                </Button>
            </div>

            {/* Таблица пачек */}
            {packs && packs.length > 0 ? (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Название</TableHead>
                                <TableHead>Описание</TableHead>
                                <TableHead>Кол-во единиц</TableHead>
                                <TableHead>Дата создания</TableHead>
                                <TableHead>Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {packs.map((pack) => (
                                <TableRow key={pack.id}>
                                    <TableCell className="font-medium">
                                        {pack.name}
                                    </TableCell>
                                    <TableCell>
                                        {pack.description ? (
                                            <span className="text-muted-foreground">
                                                {pack.description}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground italic">
                                                Без описания
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {pack.equipment.length} единиц
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(pack.created_at).toLocaleDateString('ru-RU')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(pack)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(pack.id)}
                                                disabled={deletePackMutation.isPending}
                                            >
                                                {deletePackMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 px-4 border rounded-md">
                    <PackageSearch className="w-16 h-16 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Пачки не найдены</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Создайте первую пачку оборудования, чтобы она появилась в списке.
                    </p>
                </div>
            )}

            {/* Диалоги */}
            <PackDialog
                open={showCreateDialog || !!editingPack}
                onClose={handleCloseDialog}
                pack={editingPack}
            />
        </div>
    );
}
