import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/profile/BalanceHistoryTable.tsx
import { useState, useMemo } from "react";
import { useBalanceHistory, useAdminBalanceHistory, useBalanceHistoryInfinite, useAdminBalanceHistoryInfinite } from "@/hooks/useBalanceHistory";
import { useCurrentUser } from "@/hooks/useProfile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/ui/money-text";
import { formatDateEuropean } from "@/lib/utils";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, Inbox, Trash2, Plus } from "lucide-react";
import { getOperationTypeLabel, getOperationTypeColor, getOperationTypeIcon } from "@/constants/balanceOperationTypes";
import DeleteBalanceHistoryDialog from "./DeleteBalanceHistoryDialog";
import { InfiniteScrollTrigger } from "@/components/shared/InfiniteScrollTrigger";
export default function BalanceHistoryTable({ userId, isAdminView = false, useLoadMore = false }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteDialog, setDeleteDialog] = useState({
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
    const { data: infiniteData, isLoading: infiniteLoading, isError: infiniteError, error: infiniteErrorObj, fetchNextPage, hasNextPage, isFetchingNextPage } = infiniteQueryResult;
    // Для обычного query
    const { data: historyResponse, isLoading: regularLoading, isError: regularError, error: regularErrorObj } = regularQueryResult;
    // Объединяем состояния в зависимости от режима
    const isLoading = useLoadMore ? infiniteLoading : regularLoading;
    const isError = useLoadMore ? infiniteError : regularError;
    const error = useLoadMore ? infiniteErrorObj : regularErrorObj;
    // Получаем данные в зависимости от режима
    const currentPageHistory = historyResponse?.items ?? [];
    const totalEntries = historyResponse?.total ?? 0;
    const totalPages = Math.ceil(totalEntries / 15); // 15 - PAGE_SIZE из хука
    // Для infinite query объединяем все страницы
    const allHistory = useMemo(() => infiniteData?.pages.flatMap((page) => page.items) ?? [], [infiniteData]);
    // Выбираем данные для отображения
    const history = useLoadMore ? allHistory : currentPageHistory;
    const handleDeleteClick = (historyId, description, amount) => {
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
        }
        else if (!useLoadMore && currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };
    if (isLoading) {
        return (_jsxs("div", { className: "flex items-center justify-center gap-2 text-gray-500 py-8", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), _jsx("span", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439..." })] }));
    }
    if (isError) {
        return (_jsxs("div", { className: "flex items-center justify-center gap-2 text-red-600 bg-red-50 p-4 rounded-md", children: [_jsx(AlertTriangle, { className: "h-5 w-5" }), _jsxs("span", { children: ["\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: ", error?.message || "Не удалось получить данные"] })] }));
    }
    if (history.length === 0) {
        return (_jsxs("div", { className: "text-center py-10 text-gray-500 border-2 border-dashed rounded-lg", children: [_jsx(Inbox, { className: "mx-auto h-12 w-12 text-gray-300" }), _jsx("p", { className: "mt-2 font-medium", children: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439 \u043F\u0443\u0441\u0442\u0430" }), _jsx("p", { className: "text-sm", children: "\u0417\u0434\u0435\u0441\u044C \u0431\u0443\u0434\u0443\u0442 \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0430\u0442\u044C\u0441\u044F \u0432\u0441\u0435 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F \u043F\u043E \u0432\u0430\u0448\u0435\u043C\u0443 \u0441\u0447\u0435\u0442\u0443." })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "border rounded-lg", children: _jsxs(Table, { children: [_jsx(TableCaption, { children: useLoadMore ? (allHistory.length > 0 ? `Показано ${allHistory.length} записей.` : 'Записей не найдено.') : (totalEntries > 0 ? `Показано ${history.length} из ${totalEntries} записей.` : 'Записей не найдено.') }), _jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-[120px]", children: "\u0414\u0430\u0442\u0430" }), _jsx(TableHead, { children: "\u0422\u0438\u043F \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438" }), _jsx(TableHead, { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { className: "text-right w-[150px]", children: "\u0421\u0443\u043C\u043C\u0430" }), isAdmin && isAdminView && (_jsx(TableHead, { className: "w-[80px] text-center", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" }))] }) }), _jsx(TableBody, { children: history.map((entry) => {
                                const amountColor = getOperationTypeColor(entry.operation_type, entry.amount);
                                const amountSign = entry.amount > 0 ? '+' : '';
                                const operationLabel = getOperationTypeLabel(entry.operation_type);
                                const operationIcon = getOperationTypeIcon(entry.operation_type);
                                return (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium text-xs", children: formatDateEuropean(entry.created_at) }), _jsx(TableCell, { className: "text-xs", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-base", children: operationIcon }), _jsx("span", { children: operationLabel })] }) }), _jsx(TableCell, { className: "text-xs", children: entry.description }), _jsxs(TableCell, { className: `text-right font-semibold ${amountColor}`, children: [amountSign, " ", _jsx(MoneyText, { value: entry.amount })] }), isAdmin && isAdminView && (_jsx(TableCell, { className: "text-center", children: _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleDeleteClick(entry.id, entry.description || '', entry.amount), className: "h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50", children: _jsx(Trash2, { className: "h-4 w-4" }) }) }))] }, entry.id));
                            }) })] }) }), useLoadMore ? (
            // Режим "загрузить еще" для модального окна
            _jsxs(_Fragment, { children: [hasNextPage && (_jsx("div", { className: "flex items-center justify-center space-x-2", children: _jsxs(Button, { variant: "outline", size: "sm", onClick: handleLoadMore, disabled: !hasNextPage || isFetchingNextPage, className: "flex items-center gap-2", children: [isFetchingNextPage ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(Plus, { className: "h-4 w-4" })), isFetchingNextPage ? 'Загрузка...' : 'Загрузить еще'] }) })), _jsx(InfiniteScrollTrigger, { hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage, fetchNextPage: fetchNextPage })] })) : (
            // Обычная пагинация для страниц
            totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-center space-x-2", children: [_jsxs("span", { className: "text-sm text-muted-foreground", children: ["\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 ", currentPage, " \u0438\u0437 ", totalPages] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(prev => Math.max(prev - 1, 1)), disabled: currentPage === 1, children: [_jsx(ChevronLeft, { className: "h-4 w-4 mr-1" }), "\u041D\u0430\u0437\u0430\u0434"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)), disabled: currentPage === totalPages, children: ["\u0412\u043F\u0435\u0440\u0435\u0434", _jsx(ChevronRight, { className: "h-4 w-4 ml-1" })] })] }))), _jsx(DeleteBalanceHistoryDialog, { isOpen: deleteDialog.isOpen, onClose: handleDeleteDialogClose, historyId: deleteDialog.historyId, description: deleteDialog.description, amount: deleteDialog.amount, userId: userId })] }));
}
