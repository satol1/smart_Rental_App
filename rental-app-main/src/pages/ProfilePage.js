import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/ProfilePage.tsx
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfileUpdate, useCurrentUser } from "@/hooks/useProfile";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { adminUserUpdateSchema } from "@/lib/validationSchemas";
// ✅ 1. Импортируем наш новый компонент для отображения истории
import BalanceHistoryTable from "@/components/profile/BalanceHistoryTable";
import { SkeletonList } from "@/components/ui/skeleton-list";
export default function ProfilePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuthStore();
    const queryClient = useQueryClient();
    const backTo = location.state?.from || "/";
    const { data: user, isLoading } = useCurrentUser();
    const updateProfile = useProfileUpdate();
    const [, setEmailChanged] = useState(false);
    const [originalEmail, setOriginalEmail] = useState("");
    const [showEmailWarning, setShowEmailWarning] = useState(false);
    const form = useForm({
        resolver: zodResolver(adminUserUpdateSchema),
        mode: "onChange",
        defaultValues: {
            full_name: "",
            email: "",
            phone: "",
            telegram_username: "",
        }
    });
    const { register, handleSubmit, formState: { errors, isValid, isDirty }, reset, watch, control } = form;
    useEffect(() => {
        if (user) {
            const formData = {
                full_name: user.full_name,
                email: user.email,
                phone: user.phone || "",
                telegram_username: user.telegram_username || "",
            };
            reset(formData);
            setOriginalEmail(user.email);
            // Инвалидируем кэш истории баланса при загрузке страницы профиля
            console.log(`🔄 Invalidating balance history cache for current user on profile page load`);
            queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "me"]
            });
        }
    }, [user, queryClient, reset]);
    // Отслеживаем изменения email
    const watchedEmail = watch("email");
    useEffect(() => {
        if (originalEmail && watchedEmail !== originalEmail) {
            setEmailChanged(true);
            setShowEmailWarning(true);
        }
        else {
            setEmailChanged(false);
            setShowEmailWarning(false);
        }
    }, [watchedEmail, originalEmail]);
    const onSubmit = async (data) => {
        try {
            // Проверяем, изменился ли email
            const emailChanged = user && data.email !== user.email;
            // Подготавливаем данные для отправки
            const updateData = {
                full_name: data.full_name ?? "",
                email: data.email ?? "",
                phone: data.phone || null
            };
            // Добавляем telegram_username только если он не пустой
            if (data.telegram_username?.trim()) {
                updateData.telegram_username = data.telegram_username.trim();
            }
            else {
                updateData.telegram_username = null;
            }
            await updateProfile.mutateAsync(updateData);
            toast.success("Профиль успешно обновлён");
            // Показываем уведомление-заглушку, если email был изменен
            if (emailChanged) {
                toast.info("На вашу новую почту отправлена ссылка для подтверждения (функционал в разработке).");
            }
        }
        catch (err) {
            console.error(err);
            toast.error("Ошибка при обновлении профиля");
        }
    };
    if (isLoading) {
        return (_jsx("div", { className: "max-w-4xl mx-auto px-4 py-8", role: "status", "aria-label": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044F", children: _jsx(SkeletonList, { count: 1, className: "grid-cols-1" }) }));
    }
    if (!user) {
        return (_jsxs("div", { className: "text-center mt-12", children: [_jsx("p", { className: "text-lg", children: "\u0412\u044B \u043D\u0435 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u043E\u0432\u0430\u043D\u044B." }), _jsx(Button, { className: "mt-4", onClick: () => navigate("/"), children: "\u041D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] }));
    }
    return (
    // ✅ 2. Увеличиваем максимальную ширину контейнера, чтобы таблица поместилась
    _jsxs("div", { className: "max-w-4xl mx-auto px-4 py-8 space-y-6", children: [_jsxs("div", { className: "bg-white border rounded-lg shadow-sm p-6 space-y-4", children: [_jsx("h1", { className: "text-xl font-bold text-center", children: "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0440\u043E\u0444\u0438\u043B\u044C" }), _jsxs("form", { onSubmit: handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "fullName", children: "\u0424\u0418\u041E" }), _jsx(Input, { id: "fullName", type: "text", ...register("full_name") }), errors.full_name && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.full_name.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", type: "email", ...register("email") }), errors.email && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.email.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "phone", children: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D" }), _jsx(Controller, { name: "phone", control: control, render: ({ field }) => (_jsx(PhoneInput, { id: "phone", ...field, placeholder: "+7 (___) ___-__-__" })) }), errors.phone && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.phone.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "telegram", children: "Telegram" }), _jsx(Input, { id: "telegram", type: "text", ...register("telegram_username"), placeholder: "@username \u0438\u043B\u0438 username" }), errors.telegram_username && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.telegram_username.message }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 Telegram username (\u0431\u0435\u0437 @ \u0438\u043B\u0438 \u0441 @)" })] }), showEmailWarning && (_jsxs(Alert, { children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertDescription, { children: "\u041F\u043E\u0441\u043B\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F email \u043F\u043E\u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435 \u043D\u043E\u0432\u043E\u0433\u043E \u0430\u0434\u0440\u0435\u0441\u0430. \u041D\u0430 \u0443\u043A\u0430\u0437\u0430\u043D\u043D\u0443\u044E \u043F\u043E\u0447\u0442\u0443 \u0431\u0443\u0434\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F." })] })), _jsxs("div", { className: "flex justify-between items-center pt-2", children: [_jsx(Button, { type: "submit", disabled: !isDirty || !isValid || updateProfile.isPending, children: updateProfile.isPending ? "Сохранение..." : "Сохранить" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => navigate(backTo), children: "\u041D\u0430\u0437\u0430\u0434" })] })] }), _jsxs("div", { className: "pt-4 border-t text-center space-y-2", children: [_jsx("p", { className: "text-xs text-gray-500", children: "\u0414\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u0430\u0440\u043E\u043B\u044F \u043E\u0431\u0440\u0430\u0442\u0438\u0442\u0435\u0441\u044C \u043A \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0443." }), _jsx(Button, { variant: "link", className: "text-red-600", onClick: () => {
                                    logout();
                                    navigate("/");
                                }, children: "\u0412\u044B\u0439\u0442\u0438 \u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430" })] })] }), _jsxs("div", { className: "bg-white border rounded-lg shadow-sm p-6 space-y-4", children: [_jsx("h2", { className: "text-xl font-bold", children: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0431\u0430\u043B\u0430\u043D\u0441\u0430" }), _jsx(BalanceHistoryTable, { userId: user.id })] })] }));
}
