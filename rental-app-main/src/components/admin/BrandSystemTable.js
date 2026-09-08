import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/BrandSystemTable.tsx
import { useState, useMemo } from "react";
import { useAdminBrandSystems, useDeleteBrandSystem } from "@/hooks/useAdminBrandSystems";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2, ShieldCheck } from "lucide-react";
import BrandSystemDialog from "./BrandSystemDialog";
export default function BrandSystemTable() {
    const { data: systems = [], isLoading, isError } = useAdminBrandSystems();
    const { data: allEquipment = [] } = useAllEquipment();
    const deleteMutation = useDeleteBrandSystem();
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        system: null
    });
    // Преобразуем полный список оборудования в формат для выпадающего меню
    const equipmentOptions = useMemo(() => allEquipment.map(e => ({ value: e.id.toString(), label: e.name })), [allEquipment]);
    const handleEdit = (system) => {
        setDialogState({ isOpen: true, system });
    };
    const handleCreate = () => {
        setDialogState({ isOpen: true, system: null });
    };
    const handleDelete = (id) => {
        if (window.confirm("Удалить систему бренда? Это действие нельзя отменить.")) {
            deleteMutation.mutate(id);
        }
    };
    if (isLoading) {
        return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "animate-spin" }), "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0441\u0438\u0441\u0442\u0435\u043C \u0431\u0440\u0435\u043D\u0434\u043E\u0432..."] }));
    }
    if (isError) {
        return (_jsx("p", { className: "text-red-500", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0434\u0430\u043D\u043D\u044B\u0445 \u0441\u0438\u0441\u0442\u0435\u043C \u0431\u0440\u0435\u043D\u0434\u043E\u0432." }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex justify-end", children: _jsxs(Button, { onClick: handleCreate, children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0421\u0438\u0441\u0442\u0435\u043C\u0443"] }) }), systems.length > 0 ? (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { children: "\u041A\u043E\u043B-\u0432\u043E \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" }), _jsx(TableHead, { className: "text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx(TableBody, { children: systems.map((system) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: system.name }), _jsx(TableCell, { children: system.description || (_jsx("span", { className: "text-gray-400 italic", children: "\u041D\u0435\u0442 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F" })) }), _jsx(TableCell, { children: system.equipment_ids.length }), _jsx(TableCell, { className: "text-right", children: _jsxs("div", { className: "flex justify-end gap-1", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleEdit(system), title: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C", "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0431\u0440\u0435\u043D\u0434", children: _jsx(Edit, { className: "h-4 w-4", "aria-hidden": "true" }) }), _jsx(Button, { variant: "ghost", size: "icon", className: "text-red-500 hover:text-red-700", onClick: () => handleDelete(system.id), title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0431\u0440\u0435\u043D\u0434", children: _jsx(Trash2, { className: "h-4 w-4", "aria-hidden": "true" }) })] }) })] }, system.id))) })] })) : (_jsxs("div", { className: "text-center py-10 border-dashed border-2 rounded-lg", children: [_jsx(ShieldCheck, { className: "mx-auto h-12 w-12 text-gray-300" }), _jsx("h3", { className: "mt-2 text-sm font-semibold text-gray-800", children: "\u0421\u0438\u0441\u0442\u0435\u043C\u044B \u0431\u0440\u0435\u043D\u0434\u043E\u0432 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u044B" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0421\u0438\u0441\u0442\u0435\u043C\u0443\", \u0447\u0442\u043E\u0431\u044B \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0432\u0443\u044E \u0441\u0438\u0441\u0442\u0435\u043C\u0443 \u0431\u0440\u0435\u043D\u0434\u0430." })] })), _jsx(BrandSystemDialog, { isOpen: dialogState.isOpen, onClose: () => setDialogState({ isOpen: false, system: null }), brandSystem: dialogState.system, allEquipment: equipmentOptions })] }));
}
