import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/BrandSystemDialog.tsx
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBrandSystem, useUpdateBrandSystem } from "@/hooks/useAdminBrandSystems";
// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
const brandSystemSchema = z.object({
    name: z.string().min(2, "Название должно содержать минимум 2 символа").max(100, "Название не должно превышать 100 символов"),
    description: z.string().optional(),
    equipment_ids: z.array(z.number()),
});
export default function BrandSystemDialog({ isOpen, onClose, brandSystem, allEquipment }) {
    const createMutation = useCreateBrandSystem();
    const updateMutation = useUpdateBrandSystem();
    const { register, handleSubmit, control, reset, formState: { errors, isValid }, } = useForm({
        resolver: zodResolver(brandSystemSchema),
        mode: "onChange",
    });
    useEffect(() => {
        if (isOpen) {
            reset({
                name: brandSystem?.name ?? "",
                description: brandSystem?.description ?? "",
                equipment_ids: brandSystem?.equipment_ids ?? [],
            });
        }
    }, [brandSystem, isOpen, reset]);
    const onSubmit = (data) => {
        const handleSuccess = () => {
            reset();
            onClose();
        };
        if (brandSystem) {
            updateMutation.mutate({ id: brandSystem.id, data }, { onSuccess: handleSuccess });
        }
        else {
            createMutation.mutate(data, { onSuccess: handleSuccess });
        }
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-md", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: brandSystem ? "Редактировать систему бренда" : "Новая система бренда" }), _jsx(DialogDescription, { children: brandSystem
                                ? `Редактирование "${brandSystem.name}"`
                                : "Создайте новую систему бренда для группировки совместимого оборудования." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "brand-name", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx(Input, { id: "brand-name", ...register("name"), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: Canon" }), errors.name && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.name.message }))] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "brand-description", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(Textarea, { id: "brand-description", ...register("description"), placeholder: "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0435\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)", rows: 3 }), errors.description && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.description.message }))] }), _jsxs("div", { children: [_jsx(Label, { children: "\u0421\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u043E\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435" }), _jsx(Controller, { name: "equipment_ids", control: control, render: ({ field }) => (_jsx(MultiSelect, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435...", options: allEquipment, value: field.value.map(String), onValueChange: (selected) => field.onChange(selected.map(Number)) })) }), errors.equipment_ids && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.equipment_ids.message }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || createMutation.isPending || updateMutation.isPending, children: createMutation.isPending || updateMutation.isPending
                                        ? "Сохранение..."
                                        : "Сохранить" })] })] })] }) }));
}
