// src/components/admin/AccessoryTable.tsx

import { useEffect, useState } from "react";
import { useAccessoriesWithPagination, useDeleteAccessory } from "@/hooks/useAdminAccessories";
import { useDebounce } from "@/hooks/useDebounce";
import type { Accessory } from "@/types/accessory";
import type { SortDirection } from "@/components/ui/sortable-table-head";
import { AccessoryCreateDialog, AccessoryEditDialog } from "./AccessoryDialogs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyText } from "@/components/ui/money-text";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
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
const SEARCH_DEBOUNCE_MS = 350;

export default function AccessoryTable() {
    const [currentPage, setCurrentPage] = useState(1);

    // Поиск и сортировка выполняются на сервере
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS);
    const [sortColumn, setSortColumn] = useState<string | null>("name"); // серверный дефолт sort_by=name asc
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const { data: accessoriesResponse, isLoading, error, isFetching } = useAccessoriesWithPagination(
        currentPage,
        PAGE_SIZE,
        {
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(sortColumn ? { sortBy: sortColumn, sortOrder: sortDirection } : {}),
        },
    );
    const deleteMutation = useDeleteAccessory();

    const accessories = accessoriesResponse?.items ?? [];
    const totalAccessories = accessoriesResponse?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalAccessories / PAGE_SIZE));

    const [isCreateOpen, setCreateOpen] = useState(false);
    const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
    const [deletingAccessory, setDeletingAccessory] = useState<Accessory | null>(null);

    // Новый поиск сбрасывает пагинацию на первую страницу
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    const onSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
        setCurrentPage(1);
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
                        aria-label="Поиск по названию или типу аксессуара"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Добавить аксессуар
                </Button>
            </div>
            {accessories.length > 0 ? (
                <>
                    <div className={`border rounded-md transition-opacity ${isFetching ? "opacity-60" : ""}`}>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableTableHead column="id" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort} className="w-[100px]">ID</SortableTableHead>
                                    <SortableTableHead column="name" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Название</SortableTableHead>
                                    <SortableTableHead column="type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Тип</SortableTableHead>
                                    <SortableTableHead column="price" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Цена</SortableTableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accessories.map((acc) => (
                                    <TableRow key={acc.id}>
                                        <TableCell>{acc.id}</TableCell>
                                        <TableCell className="font-medium">{acc.name}</TableCell>
                                        <TableCell>{acc.accessory_type}</TableCell>
                                        <TableCell><MoneyText value={acc.price} /></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingAccessory(acc)} aria-label={`Редактировать аксессуар ${acc.name}`}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletingAccessory(acc)} disabled={deleteMutation.isPending} aria-label={`Удалить аксессуар ${acc.name}`}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
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

            <ConfirmationDialog
                open={!!deletingAccessory}
                onOpenChange={(open) => { if (!open) setDeletingAccessory(null); }}
                title="Удалить аксессуар?"
                description={`Аксессуар «${deletingAccessory?.name ?? ""}» будет удалён безвозвратно.`}
                confirmText="Удалить"
                variant="destructive"
                onConfirm={() => {
                    const accessory = deletingAccessory;
                    setDeletingAccessory(null);
                    if (accessory) deleteMutation.mutate(accessory.id);
                }}
            />
        </>
    );
}
