import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/PackTable.tsx
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PackagePlus, Edit, Trash2, Loader2, PackageSearch } from "lucide-react";
import { useAdminPacks, useDeletePack } from "@/hooks/useAdminPacks";
import PackDialog from "./PackDialog";
export default function PackTable() {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingPack, setEditingPack] = useState(null);
    const { data: packs, isLoading, error } = useAdminPacks();
    const deletePackMutation = useDeletePack();
    const handleEdit = (pack) => {
        setEditingPack(pack);
    };
    const handleDelete = async (packId) => {
        if (window.confirm("Вы уверены, что хотите удалить эту пачку?")) {
            await deletePackMutation.mutateAsync(packId);
        }
    };
    const handleCloseDialog = () => {
        setShowCreateDialog(false);
        setEditingPack(null);
    };
    if (isLoading) {
        return (_jsxs("div", { className: "flex justify-center items-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0430\u0447\u0435\u043A..." })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "text-center py-12 px-4 border rounded-md", children: [_jsx(PackageSearch, { className: "w-16 h-16 text-red-300 mx-auto mb-3" }), _jsx("h3", { className: "text-lg font-semibold text-red-700", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438" }), _jsx("p", { className: "text-sm text-red-500", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u0430\u0447\u0435\u043A. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443." })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: "\u0421\u043F\u0438\u0441\u043E\u043A \u043F\u0430\u0447\u0435\u043A" }), _jsxs("p", { className: "text-sm text-gray-600", children: ["\u0412\u0441\u0435\u0433\u043E \u043F\u0430\u0447\u0435\u043A: ", packs?.length || 0] })] }), _jsxs(Button, { onClick: () => setShowCreateDialog(true), children: [_jsx(PackagePlus, { className: "w-4 h-4 mr-2" }), "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u043F\u0430\u0447\u043A\u0443"] })] }), packs && packs.length > 0 ? (_jsx("div", { className: "border rounded-md", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { children: "\u041A\u043E\u043B-\u0432\u043E \u0435\u0434\u0438\u043D\u0438\u0446" }), _jsx(TableHead, { children: "\u0414\u0430\u0442\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F" }), _jsx(TableHead, { children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx(TableBody, { children: packs.map((pack) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: pack.name }), _jsx(TableCell, { children: pack.description ? (_jsx("span", { className: "text-gray-600", children: pack.description })) : (_jsx("span", { className: "text-gray-400 italic", children: "\u0411\u0435\u0437 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F" })) }), _jsx(TableCell, { children: _jsxs(Badge, { variant: "secondary", children: [pack.equipment.length, " \u0435\u0434\u0438\u043D\u0438\u0446"] }) }), _jsx(TableCell, { children: new Date(pack.created_at).toLocaleDateString('ru-RU') }), _jsx(TableCell, { children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => handleEdit(pack), children: _jsx(Edit, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => handleDelete(pack.id), disabled: deletePackMutation.isPending, children: deletePackMutation.isPending ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin" })) : (_jsx(Trash2, { className: "w-4 h-4" })) })] }) })] }, pack.id))) })] }) })) : (_jsxs("div", { className: "text-center py-12 px-4 border rounded-md", children: [_jsx(PackageSearch, { className: "w-16 h-16 text-gray-300 mx-auto mb-3" }), _jsx("h3", { className: "text-lg font-semibold text-gray-700", children: "\u041F\u0430\u0447\u043A\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), _jsx("p", { className: "text-sm text-gray-500 max-w-sm mx-auto", children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E \u043F\u0430\u0447\u043A\u0443 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F, \u0447\u0442\u043E\u0431\u044B \u043E\u043D\u0430 \u043F\u043E\u044F\u0432\u0438\u043B\u0430\u0441\u044C \u0432 \u0441\u043F\u0438\u0441\u043A\u0435." })] })), _jsx(PackDialog, { open: showCreateDialog || !!editingPack, onClose: handleCloseDialog, pack: editingPack })] }));
}
