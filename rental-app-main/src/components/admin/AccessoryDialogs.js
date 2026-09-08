import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/AccessoryDialogs.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { accessorySchema } from "@/lib/validationSchemas";
import { useCreateAccessory, useUpdateAccessory, useAccessory } from "@/hooks/useAdminAccessories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
export function AccessoryCreateDialog({ open, onClose }) {
    const createMutation = useCreateAccessory();
    const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm({
        resolver: zodResolver(accessorySchema),
        mode: "onChange",
    });
    const onSubmit = (data) => {
        createMutation.mutate(data, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u041D\u043E\u0432\u044B\u0439 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440" }), _jsx(DialogDescription, { children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C \u0432 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0435 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u043E\u0432." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "name", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx(Input, { id: "name", ...register("name"), placeholder: "\u0410\u043A\u043A\u0443\u043C\u0443\u043B\u044F\u0442\u043E\u0440 LP-E6" }), errors.name && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.name.message })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "accessory_type", children: "\u0422\u0438\u043F" }), _jsx(Input, { id: "accessory_type", ...register("accessory_type"), placeholder: "\u041F\u0438\u0442\u0430\u043D\u0438\u0435" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "price", children: "\u0426\u0435\u043D\u0430 (\u20BD/\u0434\u0435\u043D\u044C)" }), _jsx(Input, { id: "price", type: "number", step: "0.01", ...register("price"), placeholder: "100" }), errors.price && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.price.message })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "description", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(Textarea, { id: "description", ...register("description"), placeholder: "\u0414\u043B\u044F \u043A\u0430\u043C\u0435\u0440 Canon R, R5, R6..." })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || createMutation.isPending, children: createMutation.isPending ? "Создание..." : "Создать" })] })] })] }) }));
}
export function AccessoryEditDialog({ accessory, open, onClose }) {
    const updateMutation = useUpdateAccessory();
    const { data: accessoryData, isLoading } = useAccessory(accessory?.id || null);
    const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm({
        resolver: zodResolver(accessorySchema),
        mode: "onChange",
        defaultValues: {
            name: "",
            accessory_type: "",
            price: 0,
            description: "",
        },
    });
    // Обновляем форму при загрузке данных аксессуара
    useEffect(() => {
        if (accessoryData) {
            reset({
                name: accessoryData.name || "",
                accessory_type: accessoryData.accessory_type || "",
                price: accessoryData.price || 0,
                description: accessoryData.description || "",
            });
        }
    }, [accessoryData, reset]);
    const onSubmit = (data) => {
        if (!accessoryData)
            return;
        updateMutation.mutate({ id: accessoryData.id, data }, {
            onSuccess: () => {
                onClose();
            },
        });
    };
    if (!accessory)
        return null;
    if (isLoading) {
        return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440" }) }), _jsx("div", { className: "flex items-center justify-center py-8", children: _jsx("p", { children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445 \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u0430..." }) })] }) }));
    }
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0430\u043A\u0441\u0435\u0441\u0441\u0443\u0430\u0440" }), _jsxs(DialogDescription, { children: ["\"", accessoryData?.name || accessory.name, "\""] })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-name", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx(Input, { id: "edit-name", ...register("name") }), errors.name && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.name.message })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-accessory_type", children: "\u0422\u0438\u043F" }), _jsx(Input, { id: "edit-accessory_type", ...register("accessory_type") })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-price", children: "\u0426\u0435\u043D\u0430 (\u20BD/\u0434\u0435\u043D\u044C)" }), _jsx(Input, { id: "edit-price", type: "number", step: "0.01", ...register("price") }), errors.price && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.price.message })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-description", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(Textarea, { id: "edit-description", ...register("description") })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || updateMutation.isPending, children: updateMutation.isPending ? "Сохранение..." : "Сохранить" })] })] })] }) }));
}
