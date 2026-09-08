import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/UserCreateDialog.tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminUserCreateFormSchema } from "@/lib/validationSchemas";
import { useAdminCreateUser } from "@/hooks/useAdminUsers";
import { USER_ROLE_OPTIONS, USER_ROLES } from "@/constants/userConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { Send } from "lucide-react";
export function UserCreateDialog({ open, onClose }) {
    const createMutation = useAdminCreateUser();
    const { register, handleSubmit, formState: { errors, isValid }, reset, control, trigger } = useForm({
        resolver: zodResolver(adminUserCreateFormSchema),
        mode: "onChange",
        defaultValues: {
            role: USER_ROLES.USER,
            privacyPolicyAccepted: true,
            termsAccepted: true,
            emailVerified: true,
        }
    });
    const onSubmit = (data) => {
        createMutation.mutate(data, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };
    const handleDialogClose = () => {
        reset();
        onClose();
    };
    return (_jsx(Dialog, { open: open, onOpenChange: handleDialogClose, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u041D\u043E\u0432\u044B\u0439 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" }), _jsx(DialogDescription, { children: "\u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0439 \u0443\u0447\u0435\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u0438 \u0441\u0432\u044F\u0437\u0430\u043D\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430." })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "create-full_name", children: "\u0424\u0418\u041E *" }), _jsx(Input, { id: "create-full_name", ...register("full_name"), placeholder: "\u0418\u0432\u0430\u043D \u041F\u0435\u0442\u0440\u043E\u0432" }), errors.full_name && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.full_name.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "create-email", children: "Email *" }), _jsx(Input, { id: "create-email", type: "email", ...register("email"), placeholder: "user@example.com" }), errors.email && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.email.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "create-phone", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }), _jsx(Controller, { name: "phone", control: control, render: ({ field }) => (_jsx(PhoneInput, { id: "create-phone", placeholder: "+7 (___) ___-__-__", ...field, error: !!errors.phone, onBlur: () => trigger("phone") })) }), errors.phone && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.phone.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "create-telegram", children: "Telegram" }), _jsxs("div", { className: "relative", children: [_jsx(Send, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "create-telegram", ...register("telegram_username"), placeholder: "@username", className: "pl-9" })] }), errors.telegram_username && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.telegram_username.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "create-password", children: "\u041F\u0430\u0440\u043E\u043B\u044C *" }), _jsx(Input, { id: "create-password", type: "password", ...register("password"), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }), errors.password && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.password.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "create-role", children: "\u0420\u043E\u043B\u044C *" }), _jsx(Controller, { name: "role", control: control, render: ({ field }) => (_jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [_jsx(SelectTrigger, { id: "create-role", children: _jsx(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u043E\u043B\u044C" }) }), _jsx(SelectContent, { children: USER_ROLE_OPTIONS.map(option => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })) }), errors.role && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.role.message })] }), _jsxs(DialogFooter, { className: "pt-4", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: handleDialogClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || createMutation.isPending, children: createMutation.isPending ? "Создание..." : "Создать пользователя" })] })] })] }) }));
}
