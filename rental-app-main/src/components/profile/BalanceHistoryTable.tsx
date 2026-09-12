// src/components/profile/BalanceHistoryTable.tsx

import { useState, useMemo } from "react";
import { useBalanceHistory, useAdminBalanceHistory, useBalanceHistoryInfinite, useAdminBalanceHistoryInfinite } from "@/hooks/useBalanceHistory";
import { useCurrentUser } from "@/hooks/useProfile";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/ui/money-text";
import { formatDateEuropean } from "@/lib/utils";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, Inbox, Trash2, Plus } from "lucide-react";
import { getOperationTypeLabel, getOperationTypeColor, getOperationTypeIcon } from "@/constants/balanceOperationTypes";
import DeleteBalanceHistoryDialog from "./DeleteBalanceHistoryDialog";
import { InfiniteScrollTrigger } from "@/components/shared/InfiniteScrollTrigger";
import type { BalanceHistoryEntry } from "@/types/balanceHistory";

interface Props {
    userId: number;
    // Флаг, определяющий, используем ли мы админский хук для получения данных
    isAdminView?: boolean;
    // Флаг для режима "загрузить еще" вместо пагинации (для модальных окон)
    useLoadMore?: boolean;
}

export default function BalanceHistoryTable({ userId, isAdminView = false, useLoadMore = false }: Props) {
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        historyId: number;
        description: string;
        amount: number;
    }>({
        isOpen: false,
        historyId: 0,
        description: '',
        amount: 0
    });

    const { data: currentUser } = useCurrentUser();
    const isAdmin = currentUser?.role === 'admin';

    // Всегда вызываем все хуки, но используем только нужные
    const adminInfiniteQueryResult = useAdminBalanceHistoryInfinite(userId);
    const userInfiniteQueryResult = useBalanceHistoryInfinite();
    const adminRegularQueryResult = useAdminBalanceHistory(userId, currentPage);
    const userRegularQueryResult = useBalanceHistory(currentPage);

    // Выбираем нужные результаты в зависимости от режима
    const infiniteQueryResult = isAdminView ? adminInfiniteQueryResult : userInfiniteQueryResult;
    const regularQueryResult = isAdminView ? adminRegularQueryResult : userRegularQueryResult;
    

    // Для infinite query
    const { 
        data: infiniteData, 
        isLoading: infiniteLoading, 
        isError: infiniteError, 
        error: infiniteErrorObj,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = infiniteQueryResult;


    // Для обычного query
    const { 
        data: historyResponse, 
        isLoading: regularLoading, 
        isError: regularError, 
        error: regularErrorObj 
    } = regularQueryResult;

    // Объединяем состояния в зависимости от режима
    const isLoading = useLoadMore ? infiniteLoading : regularLoading;
    const isError = useLoadMore ? infiniteError : regularError;
    const error = useLoadMore ? infiniteErrorObj : regularErrorObj;

    // Получаем данные в зависимости от режима
    const currentPageHistory = historyResponse?.items ?? [];
    const totalEntries = historyResponse?.total ?? 0;
    const totalPages = Math.ceil(totalEntries / 15); // 15 - PAGE_SIZE из хука

    // Для infinite query объединяем все страницы
    const allHistory = useMemo(() => 
        infiniteData?.pages.flatMap((page: { items: BalanceHistoryEntry[] }) => page.items) ?? [], 
        [infiniteData]
    );

    // Выбираем данные для отображения
    const history = useLoadMore ? allHistory : currentPageHistory;

    const handleDeleteClick = (historyId: number, description: string, amount: number) => {
        setDeleteDialog({
            isOpen: true,
            historyId,
            description,
            amount
        });
    };

    const handleDeleteDialogClose = () => {
        setDeleteDialog({
            isOpen: false,
            historyId: 0,
            description: '',
            amount: 0
        });
    };

    const handleLoadMore = () => {
        if (useLoadMore && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        } else if (!useLoadMore && currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Загрузка истории транзакций...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center gap-2 text-destructive bg-danger-soft p-4 rounded-md">
                <AlertTriangle className="h-5 w-5" />
                <span>Ошибка загрузки: {error?.message || "Не удалось получить данные"}</span>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 font-medium">История транзакций пуста</p>
                <p className="text-sm">Здесь будут отображаться все движения по вашему счету.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="border rounded-lg">
                <Table>
                    <TableCaption>
                        {useLoadMore ? (
                            allHistory.length > 0 ? `Показано ${allHistory.length} записей.` : 'Записей не найдено.'
                        ) : (
                            totalEntries > 0 ? `Показано ${history.length} из ${totalEntries} записей.` : 'Записей не найдено.'
                        )}
                    </TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Дата</TableHead>
                            <TableHead>Тип операции</TableHead>
                            <TableHead>Описание</TableHead>
                            <TableHead className="text-right w-[150px]">Сумма</TableHead>
                            {isAdmin && isAdminView && (
                                <TableHead className="w-[80px] text-center">Действия</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.map((entry: BalanceHistoryEntry) => {
                            const amountColor = getOperationTypeColor(entry.operation_type, entry.amount);
                            const amountSign = entry.amount > 0 ? '+' : '';
                            const operationLabel = getOperationTypeLabel(entry.operation_type);
                            const operationIcon = getOperationTypeIcon(entry.operation_type);

                            return (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium text-xs">
                                        {formatDateEuropean(entry.created_at)}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{operationIcon}</span>
                                            <span>{operationLabel}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">{entry.description}</TableCell>
                                    <TableCell className={`text-right font-semibold ${amountColor}`}>
                                        {amountSign} <MoneyText value={entry.amount} />
                                    </TableCell>
                                    {isAdmin && isAdminView && (
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(entry.id, entry.description || '', entry.amount)}
                                                className="h-8 w-8 p-0 text-destructive hover:bg-danger-soft"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {useLoadMore ? (
                // Режим "загрузить еще" для модального окна
                <>
                    {hasNextPage && (
                        <div className="flex items-center justify-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLoadMore}
                                disabled={!hasNextPage || isFetchingNextPage}
                                className="flex items-center gap-2"
                            >
                                {isFetchingNextPage ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                {isFetchingNextPage ? 'Загрузка...' : 'Загрузить еще'}
                            </Button>
                        </div>
                    )}
                    {/* Компонент для автоматической бесконечной прокрутки */}
                    <InfiniteScrollTrigger
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        fetchNextPage={fetchNextPage}
                    />
                </>
            ) : (
                // Обычная пагинация для страниц
                totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                            Страница {currentPage} из {totalPages}
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
                            disabled={currentPage === totalPages}
                        >
                            Вперед
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                )
            )}

            {/* Модальное окно подтверждения удаления */}
            <DeleteBalanceHistoryDialog
                isOpen={deleteDialog.isOpen}
                onClose={handleDeleteDialogClose}
                historyId={deleteDialog.historyId}
                description={deleteDialog.description}
                amount={deleteDialog.amount}
                userId={userId}
            />
        </div>
    );
}