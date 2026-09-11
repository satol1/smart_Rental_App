// src/components/admin/AccessoryTable.tsx

import { useState } from "react";
import { useAccessoriesWithPagination, useDeleteAccessory } from "@/hooks/useAdminAccessories";
import type { Accessory } from "@/types/accessory";
import { AccessoryCreateDialog, AccessoryEditDialog } from "./AccessoryDialogs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyText } from "@/components/ui/money-text";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, Wrench, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 15;

export default function AccessoryTable() {
    // +++ НАЧАЛО ИЗМЕНЕНИЙ +++
    const [currentPage, setCurrentPage] = useState(1);
    const { data: accessoriesResponse, isLoading, error } = useAccessoriesWithPagination(currentPage, PAGE_SIZE);
    const deleteMutation = useDeleteAccessory();

    const accessories = accessoriesResponse?.items ?? [];
    const totalAccessories = accessoriesResponse?.total ?? 0;
    const totalPages = Math.ceil(totalAccessories / PAGE_SIZE);
    // +++ КОНЕЦ ИЗМЕНЕНИЙ +++

    const [search, setSearch] = useState("");
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);

    const filteredAccessories = accessories.filter(acc =>
        acc.name.toLowerCase().includes(search.toLowerCase()) ||
        (acc.accessory_type && acc.accessory_type.toLowerCase().includes(search.toLowerCase()))
    );

    const handleDelete = (id: number) => {
        if (window.confirm("Вы уверены, что хотите удалить этот аксессуар?")) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <p>Загрузка аксессуаров...</p>;
    if (error) return <p className="text-destructive">Ошибка загрузки данных.</p>;

    return (
        <>
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск по названию или типу..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Добавить аксессуар
                </Button>
            </div>
            {filteredAccessories.length > 0 ? (
                <>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">ID</TableHead>
                                    <TableHead>Название</TableHead>
                                    <TableHead>Тип</TableHead>
                                    <TableHead>Цена</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAccessories.map((acc) => (
                                    <TableRow key={acc.id}>
                                        <TableCell>{acc.id}</TableCell>
                                        <TableCell className="font-medium">{acc.name}</TableCell>
                                        <TableCell>{acc.accessory_type}</TableCell>
                                        <TableCell><MoneyText value={acc.price} /></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingAccessory(acc)} aria-label={`Редактировать аксессуар ${acc.name}`}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(acc.id)} disabled={deleteMutation.isPending} aria-label={`Удалить аксессуар ${acc.name}`}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {/* +++ НАЧАЛО: Кнопки пагинации +++ */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <span className="text-sm text-muted-foreground">
                            Страница {currentPage} из {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Назад
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Вперед
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    {/* +++ КОНЕЦ: Кнопки пагинации +++ */}
                </>
            ) : (
                <div className="text-center py-12 px-4 border rounded-md">
                    <Wrench className="w-16 h-16 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Аксессуары не найдены</h3>
                    <p className="text-sm text-muted-foreground mt-1">{search ? "Попробуйте изменить поисковый запрос." : "Добавьте первый аксессуар, чтобы он появился в списке."}</p>
                </div>
            )}

            <AccessoryCreateDialog open={isCreateOpen} onClose={() => setCreateOpen(false)} />
            <AccessoryEditDialog accessory={editingAccessory} open={!!editingAccessory} onClose={() => setEditingAccessory(null)} />
        </>
    );
}