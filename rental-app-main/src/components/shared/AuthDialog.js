import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// path: rental-app-main/src/components/shared/AuthDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import AuthForm from "@/components/AuthForm";
/**
 * Модальное окно для аутентификации,
 * которое использует существующий компонент AuthForm.
 */
export default function AuthDialog({ open, onOpenChange, onSuccess }) {
    const { t } = useTranslation();
    // <<< ИЗМЕНЕНИЕ: Добавлена функция для закрытия диалога при успешной авторизации
    const handleAuthSuccess = () => {
        onOpenChange(false);
        onSuccess?.();
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-xl", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-2xl font-bold text-center", children: t("auth.welcomeTitle") }), _jsx(DialogDescription, { className: "text-center", children: t("auth.welcomeDescription") })] }), _jsx("div", { className: "py-4", children: _jsx(AuthForm, { onSuccess: handleAuthSuccess }) })] }) }));
}
