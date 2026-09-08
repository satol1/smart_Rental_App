import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/shared/CookieConsent.tsx
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useState } from "react";
import CookiePolicyModal from "./CookiePolicyModal";
/**
 * Компонент согласия на обработку cookie
 * Отображается снизу экрана при первом посещении
 * Информационное сообщение с одной кнопкой "Принять"
 * Соответствует требованиям 152-ФЗ "О персональных данных"
 */
export default function CookieConsent() {
    const { shouldShowBanner, acceptCookies } = useCookieConsent();
    const [showCookiePolicyModal, setShowCookiePolicyModal] = useState(false);
    if (!shouldShowBanner) {
        return null;
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300", role: "dialog", "aria-label": "\u0421\u043E\u0433\u043B\u0430\u0441\u0438\u0435 \u043D\u0430 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 cookie", children: _jsx(Card, { className: "m-4 shadow-lg border-2 border-blue-100 bg-white", children: _jsx(CardContent, { className: "p-4 sm:p-6", children: _jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center gap-4", children: [_jsxs("div", { className: "flex items-start gap-3 flex-1", children: [_jsx("div", { className: "mt-1 flex-shrink-0", children: _jsx(Cookie, { className: "w-6 h-6 text-blue-600" }) }), _jsx("div", { className: "flex-1", children: _jsxs("p", { className: "text-sm text-gray-700 leading-relaxed", children: ["\u041C\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C \u0444\u0430\u0439\u043B\u044B cookie, \u0447\u0442\u043E\u0431\u044B \u0432\u0430\u043C \u0431\u044B\u043B\u043E \u0443\u0434\u043E\u0431\u043D\u0435\u0435 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C\u0441\u044F \u0441\u0430\u0439\u0442\u043E\u043C. \u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044F \u043D\u0430\u0448 \u0441\u0430\u0439\u0442, \u0432\u044B \u0441\u043E\u0433\u043B\u0430\u0448\u0430\u0435\u0442\u0435\u0441\u044C \u0441 \u043D\u0430\u0448\u0435\u0439", " ", _jsx("button", { type: "button", onClick: () => setShowCookiePolicyModal(true), className: "text-blue-600 hover:text-blue-800 hover:underline font-medium", children: "\u043F\u043E\u043B\u0438\u0442\u0438\u043A\u043E\u0439 \u0432 \u043E\u0442\u043D\u043E\u0448\u0435\u043D\u0438\u0438 \u0444\u0430\u0439\u043B\u043E\u0432 cookie" }), "."] }) })] }), _jsx("div", { className: "flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0", children: _jsx(Button, { onClick: acceptCookies, className: "bg-blue-600 hover:bg-blue-700 text-white", size: "sm", children: "\u041F\u0440\u0438\u043D\u044F\u0442\u044C" }) })] }) }) }) }), _jsx(CookiePolicyModal, { open: showCookiePolicyModal, onOpenChange: setShowCookiePolicyModal })] }));
}
