import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AuthDialog from "@/components/shared/AuthDialog";
import { cn } from "@/lib/utils";
export default function AuthCallToAction({ className }) {
    const [isAuthDialogOpen, setAuthDialogOpen] = useState(false);
    // Функция для обработки успешной авторизации
    const handleAuthSuccess = () => {
        setAuthDialogOpen(false);
        // Перезагружаем страницу для обновления состояния авторизации
        window.location.reload();
    };
    return (_jsxs(_Fragment, { children: [_jsx(Card, { className: cn("bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200", className), children: _jsx(CardContent, { className: "p-8", children: _jsxs("div", { className: "flex flex-col items-center text-center space-y-6", children: [_jsx("div", { className: "w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center", children: _jsx(UserPlus, { className: "w-10 h-10 text-sky-600" }) }), _jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-2xl font-bold text-gray-900", children: "\u0420\u0430\u0441\u043A\u0440\u043E\u0439\u0442\u0435 \u0432\u0441\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438" }), _jsx("p", { className: "text-gray-600 text-lg leading-relaxed max-w-md", children: "\u0412\u043E\u0439\u0434\u0438\u0442\u0435 \u0438\u043B\u0438 \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0439\u0442\u0435\u0441\u044C, \u0447\u0442\u043E\u0431\u044B \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u0442\u044C \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u0435 \u0432 \u0440\u0435\u0437\u0435\u0440\u0432, \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0442\u044C \u0437\u0430\u043A\u0430\u0437\u044B \u0438 \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0438\u043C\u0438 \u0432 \u043B\u0438\u0447\u043D\u043E\u043C \u043A\u0430\u0431\u0438\u043D\u0435\u0442\u0435." })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 w-full max-w-sm", children: [_jsx(Button, { onClick: () => setAuthDialogOpen(true), className: "flex-1 h-12 text-base font-medium bg-sky-600 hover:bg-sky-700 text-white", children: "\u0412\u043E\u0439\u0442\u0438" }), _jsx(Button, { onClick: () => setAuthDialogOpen(true), variant: "outline", className: "flex-1 h-12 text-base font-medium border-sky-300 text-sky-700 hover:bg-sky-50", children: "\u0417\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C\u0441\u044F" })] })] }) }) }), _jsx(AuthDialog, { open: isAuthDialogOpen, onOpenChange: setAuthDialogOpen, onSuccess: handleAuthSuccess })] }));
}
