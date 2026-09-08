import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/admin/SettingsPage.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useGetSettings, useUpdateSettings } from '@/hooks/admin/useSettings';
import AdminNavigation from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Info } from "lucide-react";
const TELEGRAM_PICKUP_KEY = 'TELEGRAM_PICKUP_TEMPLATE';
const TELEGRAM_RETURN_KEY = 'TELEGRAM_RETURN_TEMPLATE';
export default function SettingsPage() {
    const { data: settings, isLoading } = useGetSettings();
    const updateMutation = useUpdateSettings();
    const { register, handleSubmit, reset, formState: { isDirty } } = useForm();
    useEffect(() => {
        if (settings) {
            const defaultPickupMessage = 'Здравствуйте, {userName}! Напоминаем о вашей аренде, которая начинается сегодня. Список оборудования:\n- {equipmentList}';
            const defaultReturnMessage = 'Здравствуйте, {userName}! Напоминаем, что сегодня необходимо вернуть оборудование. Список:\n- {equipmentList}';
            const pickupTemplate = settings.find(s => s.key === TELEGRAM_PICKUP_KEY)?.value || defaultPickupMessage;
            const returnTemplate = settings.find(s => s.key === TELEGRAM_RETURN_KEY)?.value || defaultReturnMessage;
            reset({
                [TELEGRAM_PICKUP_KEY]: pickupTemplate,
                [TELEGRAM_RETURN_KEY]: returnTemplate,
            });
        }
    }, [settings, reset]);
    const onSubmit = (data) => {
        const payload = Object.entries(data).map(([key, value]) => ({ key, value }));
        updateMutation.mutate(payload);
    };
    if (isLoading) {
        return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsx(Skeleton, { className: "h-12 w-1/2" }), _jsx(Skeleton, { className: "h-64 w-full" }), _jsx(Skeleton, { className: "h-48 w-full" })] }));
    }
    return (_jsxs("div", { className: "max-w-7xl mx-auto px-4 py-6 space-y-6", children: [_jsx(AdminNavigation, {}), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Settings, { className: "w-8 h-8 text-gray-700" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0448\u0430\u0431\u043B\u043E\u043D\u0430\u043C\u0438 \u0438 \u0434\u0440\u0443\u0433\u0438\u043C\u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430\u043C\u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u044B." })] })] }), _jsx("form", { onSubmit: handleSubmit(onSubmit), children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "\u0428\u0430\u0431\u043B\u043E\u043D\u044B \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 Telegram" }), _jsx(CardDescription, { children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u0442\u0435\u043A\u0441\u0442\u044B \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439, \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C\u044B\u0445 \u0438\u0437 \u0432\u0438\u0434\u0436\u0435\u0442\u0430 \"\u0424\u043E\u043A\u0443\u0441 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F\"." })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: TELEGRAM_PICKUP_KEY, children: "\u0428\u0430\u0431\u043B\u043E\u043D \u0434\u043B\u044F \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043E \u0412\u042B\u0414\u0410\u0427\u0415" }), _jsx(Textarea, { id: TELEGRAM_PICKUP_KEY, ...register(TELEGRAM_PICKUP_KEY), rows: 4 })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: TELEGRAM_RETURN_KEY, children: "\u0428\u0430\u0431\u043B\u043E\u043D \u0434\u043B\u044F \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u043E \u0412\u041E\u0417\u0412\u0420\u0410\u0422\u0415" }), _jsx(Textarea, { id: TELEGRAM_RETURN_KEY, ...register(TELEGRAM_RETURN_KEY), rows: 4 })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { type: "submit", disabled: !isDirty || updateMutation.isPending, children: updateMutation.isPending ? "Сохранение..." : "Сохранить изменения" }) })] })] }) }), _jsxs(Card, { className: "bg-blue-50 border-blue-200", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2 text-sm text-blue-800", children: [_jsx(Info, { className: "w-4 h-4" }), "\u0421\u043F\u0440\u0430\u0432\u043A\u0430 \u043F\u043E \u043F\u043B\u0435\u0439\u0441\u0445\u043E\u043B\u0434\u0435\u0440\u0430\u043C"] }) }), _jsxs(CardContent, { className: "text-xs text-blue-700 space-y-1", children: [_jsx("p", { children: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u044D\u0442\u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435 \u0432 \u0448\u0430\u0431\u043B\u043E\u043D\u0430\u0445. \u041E\u043D\u0438 \u0431\u0443\u0434\u0443\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0437\u0430\u043C\u0435\u043D\u0435\u043D\u044B \u043D\u0430 \u0440\u0435\u0430\u043B\u044C\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435:" }), _jsxs("p", { children: [_jsx("code", { children: '{userName}' }), " - \u0418\u043C\u044F \u043A\u043B\u0438\u0435\u043D\u0442\u0430 (\u0432\u0442\u043E\u0440\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u0424\u0418\u041E, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \"\u0418\u0432\u0430\u043D\")."] }), _jsxs("p", { children: [_jsx("code", { children: '{userPhone}' }), " - \u0422\u0435\u043B\u0435\u0444\u043E\u043D \u043A\u043B\u0438\u0435\u043D\u0442\u0430."] }), _jsxs("p", { children: [_jsx("code", { children: '{equipmentList}' }), " - \u0421\u043F\u0438\u0441\u043E\u043A \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F (\u043A\u0430\u0436\u0434\u044B\u0439 \u043F\u0443\u043D\u043A\u0442 \u0441 \u043D\u043E\u0432\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u0438)."] }), _jsxs("p", { children: [_jsx("code", { children: '{date}' }), " - \u0414\u0430\u0442\u0430 \u0432\u044B\u0434\u0430\u0447\u0438 \u0438\u043B\u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0442\u0430 (\u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 \u0414\u0414.\u041C\u041C.\u0413\u0413\u0413\u0413)."] })] })] })] }));
}
