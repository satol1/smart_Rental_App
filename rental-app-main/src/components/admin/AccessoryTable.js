import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/AccessoryTable.tsx
import { useState } from "react";
import { useAccessoriesWithPagination, useDeleteAccessory } from "@/hooks/useAdminAccessories";
import { AccessoryCreateDialog, AccessoryEditDialog } from "./AccessoryDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyText } from "@/components/ui/money-text";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
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
    const [editingAccessory, setEditingAccessory] = useState(null);
    const filteredAccessories = accessories.filter(acc => acc.name.toLowerCase().includes(search.toLowerCase()) ||
        (acc.accessory_type && acc.accessory_type.toLowerCase().includes(search.toLowerCase())));
    const handleDelete = (id) => {
        if (window.confirm("Вы уверены, что хотите удалить этот аксессуар?")) {
            deleteMutation.mutate(id);
        }
    };
    if (isLoading)
        return _jsx("p", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u043E\u0432..." });
    if (error)
        return _jsx("p", { className: "text-red-600", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445." });
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-4", children: [_jsxs("div", { className: "relative w-full max-w-sm", children: [_jsx(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044E \u0438\u043B\u0438 \u0442\u0438\u043F\u0443...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10" })] }), _jsxs(Button, { onClick: () => setCreateOpen(true), children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440"] })] }), filteredAccessories.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "border rounded-md", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { className: "w-[100px]", children: "ID" }), _jsx(TableHead, { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { children: "\u0422\u0438\u043F" }), _jsx(TableHead, { children: "\u0426\u0435\u043D\u0430" }), _jsx(TableHead, { className: "text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx(TableBody, { children: filteredAccessories.map((acc) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: acc.id }), _jsx(TableCell, { className: "font-medium", children: acc.name }), _jsx(TableCell, { children: acc.accessory_type }), _jsx(TableCell, { children: _jsx(MoneyText, { value: acc.price }) }), _jsxs(TableCell, { className: "text-right", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => setEditingAccessory(acc), "aria-label": `Редактировать аксессуар ${acc.name}`, children: _jsx(Edit, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleDelete(acc.id), disabled: deleteMutation.isPending, "aria-label": `Удалить аксессуар ${acc.name}`, children: _jsx(Trash2, { className: "h-4 w-4 text-red-500" }) })] })] }, acc.id))) })] }) }), _jsxs("div", { className: "flex items-center justify-end space-x-2 py-4", children: [_jsxs("span", { className: "text-sm text-muted-foreground", children: ["\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 ", currentPage, " \u0438\u0437 ", totalPages] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(prev => Math.max(prev - 1, 1)), disabled: currentPage === 1, children: [_jsx(ChevronLeft, { className: "h-4 w-4" }), "\u041D\u0430\u0437\u0430\u0434"] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)), disabled: currentPage === totalPages, children: ["\u0412\u043F\u0435\u0440\u0435\u0434", _jsx(ChevronRight, { className: "h-4 w-4" })] })] })] })) : (_jsxs("div", { className: "text-center py-12 px-4 border rounded-md", children: [_jsx(Wrench, { className: "w-16 h-16 text-gray-300 mx-auto mb-3" }), _jsx("h3", { className: "text-lg font-semibold text-gray-700", children: "\u0410\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: search ? "Попробуйте изменить поисковый запрос." : "Добавьте первый аксессуар, чтобы он появился в списке." })] })), _jsx(AccessoryCreateDialog, { open: isCreateOpen, onClose: () => setCreateOpen(false) }), _jsx(AccessoryEditDialog, { accessory: editingAccessory, open: !!editingAccessory, onClose: () => setEditingAccessory(null) })] }));
}
