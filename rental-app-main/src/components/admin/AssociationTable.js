import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/AssociationTable.tsx
import { useState, useMemo, useEffect } from "react";
import { useAdminAssociations, useCreateAssociation, useUpdateAssociation, useDeleteAssociation } from "@/hooks/useAdminAssociations";
// ❌ УДАЛЕНО: Больше не используем пагинированный хук для оборудования
// import { useEquipment } from "@/hooks/useEquipment";
// ✅ ДОБАВЛЕНО: Используем хук, который загружает ПОЛНЫЙ список оборудования для нашего "справочника"
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// ❌ УДАЛЕНО: Этот тип больше не нужен, так как мы не работаем с пагинацией здесь
// import type { EquipmentListResponse } from "@/core/services/EquipmentService";
// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Tags, Loader2 } from "lucide-react";
const associationSchema = z.object({
    name: z.string().min(3, "Название обязательно"),
    description: z.string().optional(),
    sort_order: z.coerce.number(),
    equipment_ids: z.array(z.number()),
});
// --- Компонент диалогового окна (без изменений в логике) ---
function AssociationDialog({ open, onClose, association, allEquipment }) {
    const createMutation = useCreateAssociation();
    const updateMutation = useUpdateAssociation();
    const { register, handleSubmit, control, reset, formState: { errors, isValid }, } = useForm({
        resolver: zodResolver(associationSchema),
        mode: "onChange",
    });
    useEffect(() => {
        if (open) {
            reset({
                name: association?.name ?? "",
                description: association?.description ?? "",
                sort_order: association?.sort_order ?? 0,
                equipment_ids: association?.equipment_ids ?? [],
            });
        }
    }, [association, open, reset]);
    const onSubmit = (data) => {
        const handleSuccess = () => {
            reset();
            onClose();
        };
        if (association) {
            updateMutation.mutate({ id: association.id, data }, { onSuccess: handleSuccess });
        }
        else {
            createMutation.mutate(data, { onSuccess: handleSuccess });
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: association ? "Редактировать ассоциацию" : "Новая ассоциация" }), _jsx(DialogDescription, { children: association ? `Редактирование "${association.name}"` : "Создайте новую подборку оборудования." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "assoc-name", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx(Input, { id: "assoc-name", ...register("name"), placeholder: "\u041D\u0430\u0431\u043E\u0440 \u0434\u043B\u044F \u0441\u0442\u0440\u0438\u043C\u0438\u043D\u0433\u0430" }), errors.name && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.name.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "assoc-sort", children: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A \u0441\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u043A\u0438" }), _jsx(Input, { id: "assoc-sort", type: "number", ...register("sort_order") })] }), _jsxs("div", { children: [_jsx(Label, { children: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0432 \u043F\u043E\u0434\u0431\u043E\u0440\u043A\u0435" }), _jsx(Controller, { name: "equipment_ids", control: control, render: ({ field }) => (_jsx(MultiSelect, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435...", options: allEquipment, value: field.value.map(String), onValueChange: (selected) => field.onChange(selected.map(Number)) })) })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || createMutation.isPending || updateMutation.isPending, children: createMutation.isPending || updateMutation.isPending ? "Сохранение..." : "Сохранить" })] })] })] }) }));
}
// --- Основной компонент таблицы ---
export default function AssociationTable() {
    const { data: associations = [], isLoading } = useAdminAssociations();
    // ✅ ИЗМЕНЕНО: Загружаем весь список оборудования один раз.
    const { data: allEquipment = [] } = useAllEquipment();
    const deleteMutation = useDeleteAssociation();
    // ✅ ИЗМЕНЕНО: Преобразуем полный список в формат для выпадающего меню.
    const equipmentOptions = useMemo(() => allEquipment.map(e => ({ value: e.id.toString(), label: e.name })), [allEquipment]);
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingAssoc, setEditingAssoc] = useState(null);
    const handleEdit = (assoc) => { setEditingAssoc(assoc); setDialogOpen(true); };
    const handleCreate = () => { setEditingAssoc(null); setDialogOpen(true); };
    const handleDelete = (id) => { if (window.confirm("Удалить ассоциацию?"))
        deleteMutation.mutate(id); };
    if (isLoading)
        return _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "animate-spin" }), " \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..."] });
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex justify-end mb-4", children: _jsxs(Button, { onClick: handleCreate, children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " \u0421\u043E\u0437\u0434\u0430\u0442\u044C"] }) }), associations.length > 0 ? (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "\u041F\u043E\u0440\u044F\u0434\u043E\u043A" }), _jsx(TableHead, { children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { children: "\u041A\u043E\u043B-\u0432\u043E \u0435\u0434." }), _jsx(TableHead, { className: "text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx(TableBody, { children: associations.map((assoc) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: assoc.sort_order }), _jsx(TableCell, { className: "font-medium", children: assoc.name }), _jsx(TableCell, { children: assoc.equipment_ids.length }), _jsxs(TableCell, { className: "text-right", children: [_jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleEdit(assoc), "aria-label": "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u0441\u0441\u043E\u0446\u0438\u0430\u0446\u0438\u044E", children: _jsx(Edit, { className: "h-4 w-4", "aria-hidden": "true" }) }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleDelete(assoc.id), "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0430\u0441\u0441\u043E\u0446\u0438\u0430\u0446\u0438\u044E", children: _jsx(Trash2, { className: "h-4 w-4 text-red-500", "aria-hidden": "true" }) })] })] }, assoc.id))) })] })) : (_jsxs("div", { className: "text-center py-10 border-dashed border-2 rounded-lg", children: [_jsx(Tags, { className: "mx-auto h-12 w-12 text-gray-300" }), _jsx("h3", { className: "mt-2 text-sm font-semibold text-gray-800", children: "\u0410\u0441\u0441\u043E\u0446\u0438\u0430\u0446\u0438\u0438 \u043D\u0435 \u0441\u043E\u0437\u0434\u0430\u043D\u044B" }), _jsx("p", { className: "mt-1 text-sm text-gray-500", children: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \"\u0421\u043E\u0437\u0434\u0430\u0442\u044C\", \u0447\u0442\u043E\u0431\u044B \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u0435\u0440\u0432\u0443\u044E." })] })), isDialogOpen && _jsx(AssociationDialog, { open: isDialogOpen, onClose: () => setDialogOpen(false), association: editingAssoc, allEquipment: equipmentOptions })] }));
}
