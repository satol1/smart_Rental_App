import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/PackDialog.tsx
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Loader2 } from "lucide-react";
import { useCreatePack, useUpdatePack, useSuggestPackItems } from "@/hooks/useAdminPacks";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
const packSchema = z.object({
    name: z.string().min(1, "Название пачки обязательно"),
    description: z.string().optional(),
    equipment_ids: z.array(z.number()).min(1, "Выберите хотя бы одно оборудование"),
});
export default function PackDialog({ open, onClose, pack }) {
    const isEditing = !!pack;
    const createPackMutation = useCreatePack();
    const updatePackMutation = useUpdatePack();
    const suggestItemsMutation = useSuggestPackItems();
    const { data: allEquipment, isLoading: isLoadingEquipment } = useAllEquipment();
    const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch, control, } = useForm({
        resolver: zodResolver(packSchema),
        defaultValues: {
            name: "",
            description: "",
            equipment_ids: [],
        },
        mode: "onChange",
    });
    const selectedEquipmentIds = watch("equipment_ids");
    // Подготавливаем опции для MultiSelect
    const equipmentOptions = useMemo(() => {
        if (!allEquipment)
            return [];
        return allEquipment.map((equipment) => ({
            label: `${equipment.brand} ${equipment.name} (ID: ${equipment.id})`,
            value: equipment.id.toString(),
        }));
    }, [allEquipment]);
    // Заполняем форму при редактировании
    useEffect(() => {
        if (pack && open) {
            reset({
                name: pack.name,
                description: pack.description || "",
                equipment_ids: pack.equipment.map(eq => eq.id),
            });
        }
        else if (!pack && open) {
            reset({
                name: "",
                description: "",
                equipment_ids: [],
            });
        }
    }, [pack, open, reset]);
    const onSubmit = async (data) => {
        try {
            if (isEditing && pack) {
                await updatePackMutation.mutateAsync({
                    id: pack.id,
                    data: {
                        name: data.name,
                        description: data.description,
                        equipment_ids: data.equipment_ids,
                    },
                });
            }
            else {
                await createPackMutation.mutateAsync({
                    name: data.name,
                    description: data.description,
                    equipment_ids: data.equipment_ids,
                });
            }
            reset();
            onClose();
        }
        catch (error) {
            // Ошибка обработается в хуке
        }
    };
    const handleClose = () => {
        reset();
        onClose();
    };
    const handleSuggestItems = async () => {
        if (selectedEquipmentIds.length === 0)
            return;
        try {
            const suggestions = await suggestItemsMutation.mutateAsync(selectedEquipmentIds[0]);
            // Добавляем предложения к уже выбранным элементам
            const newEquipmentIds = [...new Set([...selectedEquipmentIds, ...suggestions])];
            setValue("equipment_ids", newEquipmentIds, { shouldValidate: true });
        }
        catch (error) {
            // Ошибка обработается в хуке
        }
    };
    const isLoading = createPackMutation.isPending || updatePackMutation.isPending;
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "max-w-2xl max-h-[90vh] overflow-y-auto", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: isEditing ? "Редактировать пачку" : "Создать новую пачку" }) }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "name", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0430\u0447\u043A\u0438 *" }), _jsx(Input, { id: "name", ...register("name"), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u041A\u043E\u043C\u043F\u043B\u0435\u043A\u0442 \u0434\u043B\u044F \u0432\u0438\u0434\u0435\u043E\u0441\u044A\u0435\u043C\u043A\u0438" }), errors.name && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.name.message }))] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "description", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(Textarea, { id: "description", ...register("description"), placeholder: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043F\u0430\u0447\u043A\u0438, \u0447\u0442\u043E \u0432\u0445\u043E\u0434\u0438\u0442 \u0432 \u043A\u043E\u043C\u043F\u043B\u0435\u043A\u0442...", rows: 3 })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "equipment_ids", children: "\u041E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0432 \u043F\u0430\u0447\u043A\u0435 *" }), _jsxs("div", { className: "space-y-2", children: [_jsx(Controller, { name: "equipment_ids", control: control, render: ({ field }) => (_jsx(MultiSelect, { placeholder: isLoadingEquipment
                                                    ? "Загрузка оборудования..."
                                                    : "Выберите оборудование для пачки", options: equipmentOptions, value: field.value.map(id => id.toString()), onValueChange: (values) => field.onChange(values.map(v => parseInt(v))), disabled: isLoadingEquipment, maxCount: 10 })) }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: handleSuggestItems, disabled: selectedEquipmentIds.length === 0 ||
                                                    suggestItemsMutation.isPending, children: suggestItemsMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "\u041F\u043E\u0438\u0441\u043A..."] })) : (_jsxs(_Fragment, { children: [_jsx(Search, { className: "w-4 h-4 mr-2" }), "\u041D\u0430\u0439\u0442\u0438 \u043F\u043E\u0445\u043E\u0436\u0438\u0435"] })) }) }), errors.equipment_ids && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.equipment_ids.message })), selectedEquipmentIds.length > 0 && (_jsxs("p", { className: "text-xs text-gray-500", children: ["\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u0435\u0434\u0438\u043D\u0438\u0446 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F: ", selectedEquipmentIds.length] }))] })] }), _jsxs(DialogFooter, { className: "pt-4", children: [_jsx(Button, { type: "button", variant: "outline", onClick: handleClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || isLoading, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), isEditing ? "Сохранение..." : "Создание..."] })) : (isEditing ? "Сохранить изменения" : "Создать пачку") })] })] })] }) }));
}
