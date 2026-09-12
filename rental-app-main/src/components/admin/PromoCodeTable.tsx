// src/components/admin/PromoCodeTable.tsx

import { useState } from "react";
import { useAdminPromoCodes, useDeletePromoCode } from "@/hooks/useAdminPromoCodes";
import { PromoCodeDialog } from "./PromoCodeDialog";
import type { PromoCodeOut } from "@/types/promo_code";
import { formatDateEuropean } from "@/lib/utils";
import { useTableSort } from "@/hooks/useTableSort";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// ✅ Убрана иконка AlertCircle
import { Plus, Edit, Trash2, Search, Ticket } from "lucide-react";

export default function PromoCodeTable() {
    const { data: promoCodes = [], isLoading, error } = useAdminPromoCodes();
    const deleteMutation = useDeletePromoCode();

    const [search, setSearch] = useState("");
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingPromoCode, setEditingPromoCode] = useState<PromoCodeOut | null>(null);
    const [deletingPromoCode, setDeletingPromoCode] = useState<PromoCodeOut | null>(null);

    const filteredPromoCodes = promoCodes.filter(pc =>
        pc.code.toLowerCase().includes(search.toLowerCase()) ||
        pc.description?.toLowerCase().includes(search.toLowerCase())
    );

    const { sortedItems, sortColumn, sortDirection, onSort } = useTableSort(filteredPromoCodes, {
        code: (pc) => pc.code,
        discount: (pc) => pc.discount_percentage,
        status: (pc) => (pc.is_active ? 1 : 0),
        usage: (pc) => pc.times_used,
        expires: (pc) => pc.expires_at ?? null,
    }, { column: "code", direction: "asc" });

    const handleCreate = () => {
        setEditingPromoCode(null);
        setDialogOpen(true);
    };

    const handleEdit = (promoCode: PromoCodeOut) => {
        setEditingPromoCode(promoCode);
        setDialogOpen(true);
    };

    if (isLoading) return <p className="text-center py-4">Загрузка промокодов...</p>;
    if (error) return <p className="text-center text-destructive py-4">Ошибка загрузки данных.</p>;

    return (
        <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск по коду или описанию..."
                        aria-label="Поиск по коду или описанию промокода"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleCreate} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Добавить промокод
                </Button>
            </div>

            {sortedItems.length > 0 ? (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <SortableTableHead column="code" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Код</SortableTableHead>
                                <SortableTableHead column="discount" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Скидка</SortableTableHead>
                                <SortableTableHead column="status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Статус</SortableTableHead>
                                <SortableTableHead column="usage" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Использования</SortableTableHead>
                                <SortableTableHead column="expires" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>Срок действия</SortableTableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedItems.map((pc) => (
                                <TableRow key={pc.id}>
                                    <TableCell className="font-medium">{pc.code}</TableCell>
                                    <TableCell>{pc.discount_percentage}%</TableCell>
                                    <TableCell>
                                        <Badge variant={pc.is_active ? "default" : "secondary"}>
                                            {pc.is_active ? "Активен" : "Неактивен"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {pc.times_used} / {pc.max_uses ?? '∞'}
                                    </TableCell>
                                    <TableCell>
                                        {pc.expires_at ? formatDateEuropean(pc.expires_at) : 'Бессрочно'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pc)} aria-label="Редактировать промокод">
                                            <Edit className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingPromoCode(pc)} disabled={deleteMutation.isPending} aria-label="Удалить промокод">
                                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 px-4 border-2 border-dashed rounded-lg">
                    <Ticket className="w-16 h-16 text-muted-foreground/50 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Промокоды не найдены</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {search ? "Попробуйте изменить поисковый запрос." : "Добавьте первый промокод, чтобы он появился в списке."}
                    </p>
                </div>
            )}

            <PromoCodeDialog
                open={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                promoCode={editingPromoCode}
            />

            <ConfirmationDialog
                open={!!deletingPromoCode}
                onOpenChange={(open) => { if (!open) setDeletingPromoCode(null); }}
                title="Удалить промокод?"
                description={`Промокод «${deletingPromoCode?.code ?? ""}» будет удалён безвозвратно. Активные скидки по нему перестанут применяться.`}
                confirmText="Удалить"
                variant="destructive"
                onConfirm={() => {
                    if (deletingPromoCode) deleteMutation.mutate(deletingPromoCode.id);
                    setDeletingPromoCode(null);
                }}
            />
        </>
    );
}
