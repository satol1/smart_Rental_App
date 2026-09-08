import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/PromoCodeTable.tsx
import { useState } from "react";
import { useAdminPromoCodes, useDeletePromoCode } from "@/hooks/useAdminPromoCodes";
import { PromoCodeDialog } from "./PromoCodeDialog";
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
    const [editingPromoCode, setEditingPromoCode] = useState(null);
    const filteredPromoCodes = promoCodes.filter(pc => pc.code.toLowerCase().includes(search.toLowerCase()) ||
        pc.description?.toLowerCase().includes(search.toLowerCase()));
    const handleCreate = () => {
        setEditingPromoCode(null);
        setDialogOpen(true);
    };
    const handleEdit = (promoCode) => {
        setEditingPromoCode(promoCode);
        setDialogOpen(true);
    };
    const handleDelete = (id) => {
        if (window.confirm("Вы уверены, что хотите удалить этот промокод? Действие необратимо.")) {
            deleteMutation.mutate(id);
        }
    };
    if (isLoading)
        return _jsx("p", { className: "text-center py-4", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u043E\u0432..." });
    if (error)
        return _jsx("p", { className: "text-center text-red-600 py-4", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445." });
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4 mb-4", children: [_jsxs("div", { className: "relative w-full sm:max-w-xs", children: [_jsx(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), _jsx(Input, { placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043A\u043E\u0434\u0443 \u0438\u043B\u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044E...", value: search, onChange: (e) => setSearch(e.target.value), className: "pl-10" })] }), _jsxs(Button, { onClick: handleCreate, className: "w-full sm:w-auto", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434"] })] }), filteredPromoCodes.length > 0 ? (_jsx("div", { className: "border rounded-md overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "\u041A\u043E\u0434" }), _jsx(TableHead, { children: "\u0421\u043A\u0438\u0434\u043A\u0430" }), _jsx(TableHead, { children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx(TableHead, { children: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F" }), _jsx(TableHead, { children: "\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" }), _jsx(TableHead, { className: "text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx(TableBody, { children: filteredPromoCodes.map((pc) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: pc.code }), _jsxs(TableCell, { children: [pc.discount_percentage, "%"] }), _jsx(TableCell, { children: _jsx(Badge, { variant: pc.is_active ? "default" : "secondary", children: pc.is_active ? "Активен" : "Неактивен" }) }), _jsxs(TableCell, { children: [pc.times_used, " / ", pc.max_uses ?? '∞'] }), _jsx(TableCell, { children: pc.expires_at ? formatDateEuropean(pc.expires_at) : 'Бессрочно' }), _jsxs(TableCell, { className: "text-right", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleEdit(pc), "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434", children: _jsx(Edit, { className: "h-4 w-4", "aria-hidden": "true" }) }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleDelete(pc.id), disabled: deleteMutation.isPending, "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u043E\u043C\u043E\u043A\u043E\u0434", children: _jsx(Trash2, { className: "h-4 w-4 text-red-500", "aria-hidden": "true" }) })] })] }, pc.id))) })] }) })) : (_jsxs("div", { className: "text-center py-12 px-4 border-2 border-dashed rounded-lg", children: [_jsx(Ticket, { className: "w-16 h-16 text-gray-300 mx-auto mb-3" }), _jsx("h3", { className: "text-lg font-semibold text-gray-700", children: "\u041F\u0440\u043E\u043C\u043E\u043A\u043E\u0434\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: search ? "Попробуйте изменить поисковый запрос." : "Добавьте первый промокод, чтобы он появился в списке." })] })), _jsx(PromoCodeDialog, { open: isDialogOpen, onClose: () => setDialogOpen(false), promoCode: editingPromoCode })] }));
}
