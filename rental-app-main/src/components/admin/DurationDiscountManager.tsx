// src/components/admin/DurationDiscountManager.tsx

import { useState, useMemo } from 'react';
import { useDurationDiscounts, useCreateDurationDiscount, useDeleteDurationDiscount } from '@/hooks/useAdminDiscounts';
// +++ НАЧАЛО ИЗМЕНЕНИЙ: Исправляем импорт типов +++
import type { DiscountPayload, DurationDiscount } from '@/types/discount';
// +++ КОНЕЦ ИЗМЕНЕНИЙ +++
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PAGE_SIZE = 10;

export default function DurationDiscountManager() {
    const [currentPage, setCurrentPage] = useState(1);
    const { data: discountResponse, isLoading, isError } = useDurationDiscounts(currentPage, PAGE_SIZE);

    const discounts = useMemo(() => discountResponse?.items ?? [], [discountResponse]);
    const totalDiscounts = useMemo(() => discountResponse?.total ?? 0, [discountResponse]);
    const totalPages = Math.ceil(totalDiscounts / PAGE_SIZE);

    const createMutation = useCreateDurationDiscount();
    const deleteMutation = useDeleteDurationDiscount();

    const [newItem, setNewItem] = useState<DiscountPayload>({ min_days: 0, discount_percentage: 0 });

    const handleCreate = () => {
        if (!newItem.min_days || newItem.min_days <= 0) {
            alert("Количество дней должно быть больше 0.");
            return;
        }
        if (!newItem.discount_percentage || newItem.discount_percentage <= 0) {
            alert("Процент скидки должен быть больше 0.");
            return;
        }
        createMutation.mutate(newItem, {
            onSuccess: () => setNewItem({ min_days: 0, discount_percentage: 0 })
        });
    };

    if (isLoading) {
        return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>Загрузка данных о скидках...</div>;
    }

    if (isError) {
        return <Alert variant="destructive"><AlertTitle>Ошибка!</AlertTitle><AlertDescription>Не удалось загрузить данные о скидках.</AlertDescription></Alert>;
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Минимальное количество дней</TableHead>
                            <TableHead className="w-[40%]">Процент скидки (%)</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {discounts.map((d: DurationDiscount) => (
                            <TableRow key={d.id}>
                                <TableCell>{d.min_days}</TableCell>
                                <TableCell>{d.discount_percentage}%</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(d.id)} disabled={deleteMutation.isPending} aria-label="Удалить правило скидки">
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell>
                                <Input type="number" placeholder="Напр. 7" value={newItem.min_days || ''} onChange={e => setNewItem((p: DiscountPayload) => ({...p, min_days: parseInt(e.target.value, 10) || 0}))} />
                            </TableCell>
                            <TableCell>
                                <Input type="number" placeholder="Напр. 15" value={newItem.discount_percentage || ''} onChange={e => setNewItem((p: DiscountPayload) => ({...p, discount_percentage: parseInt(e.target.value, 10) || 0}))} />
                            </TableCell>
                            <TableCell className="text-right">
                                <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
                                    {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Добавить
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
                <span className="text-sm text-muted-foreground">
                    Страница {currentPage} из {totalPages > 0 ? totalPages : 1}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Назад
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                >
                    Вперед
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
            </div>

            <p className="text-sm text-gray-600 pt-2">
                <strong>Как это работает:</strong> Система автоматически применит скидку с наибольшим порогом дней, который не превышает общее количество дней аренды.
                <br />
                <em>Например, если есть скидки для 3 и 7 дней, а аренда на 8 дней, будет применена скидка для 7 дней.</em>
            </p>
        </div>
    );
}