import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/DurationDiscountManager.tsx
import { useState, useMemo } from 'react';
import { useDurationDiscounts, useCreateDurationDiscount, useDeleteDurationDiscount } from '@/hooks/useAdminDiscounts';
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
    const [newItem, setNewItem] = useState({ min_days: 0, discount_percentage: 0 });
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
        return _jsxs("div", { className: "flex items-center gap-2 text-gray-500", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u043E \u0441\u043A\u0438\u0434\u043A\u0430\u0445..."] });
    }
    if (isError) {
        return _jsxs(Alert, { variant: "destructive", children: [_jsx(AlertTitle, { children: "\u041E\u0448\u0438\u0431\u043A\u0430!" }), _jsx(AlertDescription, { children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0435 \u043E \u0441\u043A\u0438\u0434\u043A\u0430\u0445." })] });
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "border rounded-md", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-[40%]", children: "\u041C\u0438\u043D\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043D\u0435\u0439" }), _jsx(TableHead, { className: "w-[40%]", children: "\u041F\u0440\u043E\u0446\u0435\u043D\u0442 \u0441\u043A\u0438\u0434\u043A\u0438 (%)" }), _jsx(TableHead, { className: "text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsxs(TableBody, { children: [discounts.map((d) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: d.min_days }), _jsxs(TableCell, { children: [d.discount_percentage, "%"] }), _jsx(TableCell, { className: "text-right", children: _jsx(Button, { variant: "ghost", size: "icon", onClick: () => deleteMutation.mutate(d.id), disabled: deleteMutation.isPending, "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u043E \u0441\u043A\u0438\u0434\u043A\u0438", children: _jsx(Trash2, { className: "h-4 w-4 text-red-500" }) }) })] }, d.id))), _jsxs(TableRow, { children: [_jsx(TableCell, { children: _jsx(Input, { type: "number", placeholder: "\u041D\u0430\u043F\u0440. 7", value: newItem.min_days || '', onChange: e => setNewItem((p) => ({ ...p, min_days: parseInt(e.target.value, 10) || 0 })) }) }), _jsx(TableCell, { children: _jsx(Input, { type: "number", placeholder: "\u041D\u0430\u043F\u0440. 15", value: newItem.discount_percentage || '', onChange: e => setNewItem((p) => ({ ...p, discount_percentage: parseInt(e.target.value, 10) || 0 })) }) }), _jsx(TableCell, { className: "text-right", children: _jsxs(Button, { size: "sm", onClick: handleCreate, disabled: createMutation.isPending, children: [createMutation.isPending ? _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : _jsx(PlusCircle, { className: "mr-2 h-4 w-4" }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"] }) })] })] })] }) }), _jsxs("div", { className: "flex items-center justify-end space-x-2 pt-2", children: [_jsxs("span", { className: "text-sm text-muted-foreground", children: ["\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 ", currentPage, " \u0438\u0437 ", totalPages > 0 ? totalPages : 1] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(prev => Math.max(prev - 1, 1)), disabled: currentPage === 1, children: [_jsx(ChevronLeft, { className: "h-4 w-4 mr-1" }), "\u041D\u0430\u0437\u0430\u0434"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)), disabled: currentPage >= totalPages, children: ["\u0412\u043F\u0435\u0440\u0435\u0434", _jsx(ChevronRight, { className: "h-4 w-4 ml-1" })] })] }), _jsxs("p", { className: "text-sm text-gray-600 pt-2", children: [_jsx("strong", { children: "\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442:" }), " \u0421\u0438\u0441\u0442\u0435\u043C\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0440\u0438\u043C\u0435\u043D\u0438\u0442 \u0441\u043A\u0438\u0434\u043A\u0443 \u0441 \u043D\u0430\u0438\u0431\u043E\u043B\u044C\u0448\u0438\u043C \u043F\u043E\u0440\u043E\u0433\u043E\u043C \u0434\u043D\u0435\u0439, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043D\u0435 \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u043E\u0431\u0449\u0435\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u0434\u043D\u0435\u0439 \u0430\u0440\u0435\u043D\u0434\u044B.", _jsx("br", {}), _jsx("em", { children: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u0435\u0441\u043B\u0438 \u0435\u0441\u0442\u044C \u0441\u043A\u0438\u0434\u043A\u0438 \u0434\u043B\u044F 3 \u0438 7 \u0434\u043D\u0435\u0439, \u0430 \u0430\u0440\u0435\u043D\u0434\u0430 \u043D\u0430 8 \u0434\u043D\u0435\u0439, \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0430 \u0441\u043A\u0438\u0434\u043A\u0430 \u0434\u043B\u044F 7 \u0434\u043D\u0435\u0439." })] })] }));
}
