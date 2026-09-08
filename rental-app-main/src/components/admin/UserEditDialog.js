import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/UserEditDialog.tsx
import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminUserUpdateSchema } from "@/lib/validationSchemas";
import { useAdminUpdateUser } from "@/hooks/useAdminUsers";
import { useCurrentUser } from "@/hooks/useProfile";
import { USER_ROLE_OPTIONS } from "@/constants/userConstants";
import { USER_STATUS_OPTIONS, USER_STATUS } from "@/constants/userStatusConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { Send } from "lucide-react";
// Используем новые статусы из констант
const statusOptions = USER_STATUS_OPTIONS;
export function UserEditDialog({ user, open, onClose }) {
    const { data: currentUser } = useCurrentUser();
    const isAdmin = currentUser?.role === 'admin';
    const updateMutation = useAdminUpdateUser();
    // Проверка прав на изменение статуса "Персона НонГрата" (только админ)
    const canChangePersonaNonGrata = (newStatus, currentStatus) => {
        if (newStatus === USER_STATUS.PERSONA_NON_GRATA || currentStatus === USER_STATUS.PERSONA_NON_GRATA) {
            return isAdmin;
        }
        return true; // Менеджер может менять другие статусы
    };
    const { register, handleSubmit, formState: { errors, isValid, isDirty }, reset, control } = useForm({
        resolver: zodResolver(adminUserUpdateSchema),
        mode: "onChange",
        // Устанавливаем значения по умолчанию СРАЗУ
        defaultValues: {
            full_name: user?.full_name || "",
            phone: user?.phone || "",
            telegram_username: user?.telegram_username || "",
            status: user?.status || USER_STATUS.NEW,
            notes: user?.notes || "",
            balance: user?.balance || 0,
            role: user?.role,
        }
    });
    // Этот useEffect нужен для обновления формы, если объект user изменится
    useEffect(() => {
        if (user && open) {
            const formData = {
                full_name: user.full_name,
                phone: user.phone || "",
                telegram_username: user.telegram_username || "",
                status: user.status || USER_STATUS.NEW,
                notes: user.notes || "",
                balance: user.balance,
                role: user.role,
            };
            reset(formData);
        }
    }, [user, open, reset]); // Добавляем reset в массив зависимостей
    const onSubmit = (data) => {
        if (!user)
            return;
        // Проверка прав на изменение статуса "Персона НонГрата"
        if (data.status && !canChangePersonaNonGrata(data.status, user.status)) {
            // Это должно быть обработано через валидацию формы, но добавим проверку на всякий случай
            return;
        }
        updateMutation.mutate({ userId: user.id, data }, {
            onSuccess: () => {
                onClose();
            },
        });
    };
    if (!user)
        return null;
    return (_jsx(_Fragment, { children: _jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "sm:max-w-[600px]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0444\u0438\u043B\u044F" }), _jsxs(DialogDescription, { children: ["\u0412\u044B \u0438\u0437\u043C\u0435\u043D\u044F\u0435\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F: ", _jsx("strong", { children: user.full_name })] })] }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-email", children: "Email (\u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C)" }), _jsx(Input, { id: "edit-email", value: user.email, disabled: true })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-full_name", children: "\u0424\u0418\u041E *" }), _jsx(Input, { id: "edit-full_name", ...register("full_name") }), errors.full_name && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.full_name.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-phone", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }), _jsx(Controller, { name: "phone", control: control, render: ({ field }) => (_jsx(PhoneInput, { id: "edit-phone", ...field })) }), errors.phone && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.phone.message })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-telegram", children: "Telegram" }), _jsxs("div", { className: "relative", children: [_jsx(Send, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" }), _jsx(Input, { id: "edit-telegram", ...register("telegram_username"), placeholder: "@username", className: "pl-9" })] }), errors.telegram_username && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.telegram_username.message })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-role", children: "\u0420\u043E\u043B\u044C" }), _jsx(Controller, { name: "role", control: control, render: ({ field }) => (_jsxs(Select, { onValueChange: field.onChange, value: field.value, disabled: !isAdmin, children: [_jsx(SelectTrigger, { id: "edit-role", children: _jsx(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0440\u043E\u043B\u044C" }) }), _jsx(SelectContent, { children: USER_ROLE_OPTIONS.map(option => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] })) }), !isAdmin && _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D \u043C\u043E\u0436\u0435\u0442 \u043C\u0435\u043D\u044F\u0442\u044C \u0440\u043E\u043B\u044C." })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-status", children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx(Controller, { name: "status", control: control, render: ({ field }) => {
                                                    const currentValue = field.value || user?.status || "";
                                                    const isPersonaNonGrataRestricted = (currentValue === USER_STATUS.PERSONA_NON_GRATA || field.value === USER_STATUS.PERSONA_NON_GRATA) && !isAdmin;
                                                    return (_jsxs(_Fragment, { children: [_jsxs(Select, { onValueChange: (value) => {
                                                                    if (canChangePersonaNonGrata(value, user?.status)) {
                                                                        field.onChange(value);
                                                                    }
                                                                }, value: field.value, disabled: isPersonaNonGrataRestricted, children: [_jsx(SelectTrigger, { id: "edit-status", children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: statusOptions.map(option => (_jsx(SelectItem, { value: option.value, children: option.label }, option.value))) })] }), isPersonaNonGrataRestricted && (_jsx("p", { className: "text-xs text-amber-600 mt-1", children: "\u0422\u043E\u043B\u044C\u043A\u043E \u0430\u0434\u043C\u0438\u043D \u043C\u043E\u0436\u0435\u0442 \u0438\u0437\u043C\u0435\u043D\u044F\u0442\u044C \u0441\u0442\u0430\u0442\u0443\u0441 \"\u041F\u0435\u0440\u0441\u043E\u043D\u0430 \u041D\u043E\u043D\u0413\u0440\u0430\u0442\u0430\"" }))] }));
                                                } })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-balance", children: "\u0411\u0430\u043B\u0430\u043D\u0441" }), _jsx(Input, { id: "edit-balance", type: "number", step: "0.01", ...register("balance"), placeholder: "0.00" }), errors.balance && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.balance.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "edit-notes", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438 (\u0432\u0438\u0434\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0443)" }), _jsx(Textarea, { id: "edit-notes", ...register("notes"), placeholder: "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u043A\u043B\u0438\u0435\u043D\u0442\u0435..." })] }), _jsxs(DialogFooter, { className: "pt-4", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isDirty || !isValid || updateMutation.isPending, children: updateMutation.isPending ? "Сохранение..." : "Сохранить изменения" })] })] })] }) }) }));
}
