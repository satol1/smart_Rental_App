import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/PromoCodeDialog.tsx
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useCreatePromoCode, useUpdatePromoCode, fetchGeneratedPromoCode } from "@/hooks/useAdminPromoCodes";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useCurrentUser } from "@/hooks/useProfile";
import { promoCodeFormSchema } from "@/lib/validationSchemas";
import { MultiSelect } from "@/components/ui/multi-select";
export function PromoCodeDialog({ promoCode, open, onClose }) {
    const { data: user } = useCurrentUser();
    const createMutation = useCreatePromoCode();
    const updateMutation = useUpdatePromoCode();
    // ✅ ИЗМЕНЕНИЕ: Используем новый хук для получения полного списка оборудования
    const { data: allEquipment = [] } = useAllEquipment();
    const { data: usersResponse, isLoading: isLoadingUsers } = useAdminUsers();
    // Аналогично поступаем с пользователями
    const users = useMemo(() => usersResponse?.pages?.flatMap(page => page.items) ?? [], [usersResponse]);
    const { register, handleSubmit, control, reset, setValue, formState: { errors, isValid }, } = useForm({
        resolver: zodResolver(promoCodeFormSchema),
        mode: "onChange",
    });
    useEffect(() => {
        if (open) {
            if (promoCode) {
                reset({
                    code: promoCode.code,
                    description: promoCode.description ?? undefined,
                    discount_percentage: promoCode.discount_percentage,
                    is_active: promoCode.is_active,
                    valid_from: promoCode.valid_from ? new Date(promoCode.valid_from) : undefined,
                    expires_at: promoCode.expires_at ? new Date(promoCode.expires_at) : undefined,
                    max_uses: promoCode.max_uses ?? undefined,
                    max_uses_per_user: promoCode.max_uses_per_user ?? undefined,
                    min_order_amount: promoCode.min_order_amount ?? undefined,
                    specific_to_user_id: promoCode.specific_to_user_id ?? undefined,
                    applicable_to_equipment_ids: promoCode.applicable_to_equipment_ids ?? [],
                    applicable_to_equipment_types: promoCode.applicable_to_equipment_types ?? [],
                });
            }
            else {
                reset({
                    code: "",
                    description: "",
                    discount_percentage: 10,
                    is_active: true,
                    max_uses_per_user: 1,
                    applicable_to_equipment_ids: [],
                    applicable_to_equipment_types: [],
                });
            }
        }
    }, [promoCode, open, reset]);
    const onSubmit = (data) => {
        const maxDiscount = user?.role === 'admin' ? 50 : 20;
        if (data.discount_percentage > maxDiscount) {
            toast.error(`Максимальная скидка для вашей роли: ${maxDiscount}%`);
            return;
        }
        const payload = {
            ...data,
            valid_from: data.valid_from ? data.valid_from.toISOString() : null,
            expires_at: data.expires_at ? data.expires_at.toISOString() : null,
        };
        if (promoCode) {
            updateMutation.mutate({ id: promoCode.id, data: payload }, { onSuccess: onClose });
        }
        else {
            createMutation.mutate(payload, { onSuccess: onClose });
        }
    };
    const handleGenerateCode = async () => {
        const newCode = await fetchGeneratedPromoCode();
        if (newCode) {
            setValue("code", newCode, { shouldValidate: true, shouldDirty: true });
        }
    };
    const isLoading = createMutation.isPending || updateMutation.isPending;
    // ✅ ИЗМЕНЕНИЕ: Используем `allEquipment` для создания опций
    const equipmentOptions = useMemo(() => allEquipment.map(e => ({ value: e.id.toString(), label: e.name })), [allEquipment]);
    const equipmentTypeOptions = useMemo(() => [...new Set(allEquipment.map(e => e.equipment_type))].map(type => ({ value: type, label: type })), [allEquipment]);
    const userOptions = useMemo(() => users.map((u) => ({ value: u.id.toString(), label: `${u.full_name} (${u.email})` })), [users]);
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "sm:max-w-[700px] max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: promoCode ? "Редактировать промокод" : "Создать новый промокод" }), _jsx(DialogDescription, { children: promoCode ? `Редактирование "${promoCode.code}"` : "Заполните детали для нового промокода." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-4 pr-2", children: [_jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { htmlFor: "code", className: "text-right", children: "\u041A\u043E\u0434 *" }), _jsxs("div", { className: "col-span-3 flex items-center gap-2", children: [_jsx(Input, { id: "code", ...register("code"), className: "flex-grow", placeholder: "SUMMER25" }), _jsx(Button, { type: "button", variant: "outline", size: "icon", onClick: handleGenerateCode, title: "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u0434", "aria-label": "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u0434", children: _jsx(RefreshCw, { className: "h-4 w-4", "aria-hidden": "true" }) })] }), errors.code && _jsx("p", { className: "col-start-2 col-span-3 text-xs text-red-500 mt-1", children: errors.code.message })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { htmlFor: "discount_percentage", className: "text-right", children: "\u0421\u043A\u0438\u0434\u043A\u0430, % *" }), _jsx("div", { className: "col-span-3", children: _jsx(Input, { id: "discount_percentage", type: "number", ...register("discount_percentage") }) }), errors.discount_percentage && _jsx("p", { className: "col-start-2 col-span-3 text-xs text-red-500 mt-1", children: errors.discount_percentage.message })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { htmlFor: "description", className: "text-right", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx("div", { className: "col-span-3", children: _jsx(Input, { id: "description", ...register("description"), placeholder: "\u0414\u043B\u044F \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0435\u0433\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F" }) })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { className: "text-right", children: "\u041B\u0438\u043C\u0438\u0442\u044B" }), _jsxs("div", { className: "col-span-3 grid grid-cols-3 gap-2", children: [_jsx(Input, { type: "number", ...register("max_uses"), placeholder: "\u0412\u0441\u0435\u0433\u043E" }), _jsx(Input, { type: "number", ...register("max_uses_per_user"), placeholder: "\u041D\u0430 \u044E\u0437\u0435\u0440\u0430" }), _jsx(Input, { type: "number", ...register("min_order_amount"), placeholder: "\u041C\u0438\u043D. \u0441\u0443\u043C\u043C\u0430 \u20BD" })] })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { className: "text-right", children: "\u0421\u0440\u043E\u043A \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F" }), _jsxs("div", { className: "col-span-3 grid grid-cols-2 gap-2", children: [_jsx(Controller, { control: control, name: "valid_from", render: ({ field }) => (_jsx(Input, { type: "date", onChange: (e) => field.onChange(e.target.valueAsDate), value: field.value ? field.value.toISOString().split('T')[0] : '' })) }), _jsx(Controller, { control: control, name: "expires_at", render: ({ field }) => (_jsx(Input, { type: "date", onChange: (e) => field.onChange(e.target.valueAsDate), value: field.value ? field.value.toISOString().split('T')[0] : '' })) })] }), errors.expires_at && _jsx("p", { className: "col-start-2 col-span-3 text-xs text-red-500 mt-1", children: errors.expires_at.message })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { className: "text-right", children: "\u0414\u043B\u044F \u0442\u043E\u0432\u0430\u0440\u043E\u0432" }), _jsx("div", { className: "col-span-3", children: _jsx(Controller, { control: control, name: "applicable_to_equipment_ids", render: ({ field }) => (_jsx(MultiSelect, { placeholder: "\u0414\u043B\u044F \u0432\u0441\u0435\u0433\u043E \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F", options: equipmentOptions, value: field.value?.map(String) || [], onValueChange: (selected) => field.onChange(selected.map(Number)) })) }) })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { className: "text-right", children: "\u0414\u043B\u044F \u0442\u0438\u043F\u043E\u0432" }), _jsx("div", { className: "col-span-3", children: _jsx(Controller, { control: control, name: "applicable_to_equipment_types", render: ({ field }) => (_jsx(MultiSelect, { placeholder: "\u0414\u043B\u044F \u0432\u0441\u0435\u0445 \u0442\u0438\u043F\u043E\u0432", options: equipmentTypeOptions, value: field.value || [], onValueChange: field.onChange })) }) })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { className: "text-right", children: "\u0414\u043B\u044F \u044E\u0437\u0435\u0440\u0430" }), _jsx("div", { className: "col-span-3", children: _jsx(Controller, { control: control, name: "specific_to_user_id", render: ({ field }) => (_jsxs(Select, { onValueChange: (value) => field.onChange(value === 'all' ? undefined : Number(value)), value: field.value?.toString(), disabled: isLoadingUsers, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, { placeholder: "\u0414\u043B\u044F \u0432\u0441\u0435\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "all", children: "\u0414\u043B\u044F \u0432\u0441\u0435\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439" }), userOptions.map((opt) => _jsx(SelectItem, { value: opt.value, children: opt.label }, opt.value))] })] })) }) })] }), _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { className: "text-right", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsxs("div", { className: "col-span-3 flex items-center space-x-2", children: [_jsx(Controller, { control: control, name: "is_active", render: ({ field }) => (_jsx(Switch, { id: "is_active", checked: field.value, onCheckedChange: field.onChange })) }), _jsx(Label, { htmlFor: "is_active", className: "font-normal cursor-pointer", children: "\u0410\u043A\u0442\u0438\u0432\u0435\u043D" })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || isLoading, children: isLoading ? "Сохранение..." : "Сохранить" })] })] })] }) }));
}
