// src/components/admin/PromoCodeTable.tsx

import { useState } from "react";
import { useAdminPromoCodes, useDeletePromoCode } from "@/hooks/useAdminPromoCodes";
import { PromoCodeDialog } from "./PromoCodeDialog";
import type { PromoCodeOut } from "@/types/promo_code";
import { formatDateEuropean } from "@/lib/utils";

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

    const filteredPromoCodes = promoCodes.filter(pc =>
        pc.code.toLowerCase().includes(search.toLowerCase()) ||
        pc.description?.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = () => {
        setEditingPromoCode(null);
        setDialogOpen(true);
    };

    const handleEdit = (promoCode: PromoCodeOut) => {
        setEditingPromoCode(promoCode);
        setDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm("Вы уверены, что хотите удалить этот промокод? Действие необратимо.")) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <p className="text-center py-4">Загрузка промокодов...</p>;
    if (error) return <p className="text-center text-red-600 py-4">Ошибка загрузки данных.</p>;

    return (
        <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Поиск по коду или описанию..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleCreate} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Добавить промокод
                </Button>
            </div>

            {filteredPromoCodes.length > 0 ? (
                <div className="border rounded-md overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Код</TableHead>
                                <TableHead>Скидка</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Использования</TableHead>
                                <TableHead>Срок действия</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredPromoCodes.map((pc) => (
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
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(pc)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pc.id)} disabled={deleteMutation.isPending}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 px-4 border-2 border-dashed rounded-lg">
                    <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-gray-700">Промокоды не найдены</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {search ? "Попробуйте изменить поисковый запрос." : "Добавьте первый промокод, чтобы он появился в списке."}
                    </p>
                </div>
            )}

            <PromoCodeDialog
                open={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                promoCode={editingPromoCode}
            />
        </>
    );
}