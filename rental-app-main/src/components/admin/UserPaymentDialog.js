import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// path: rental-app-main/src/components/admin/UserPaymentDialog.tsx
import { formatMoney } from "@/components/ui/money-text";
import { useState, useEffect } from "react"; // ✅ ИЗМЕНЕНИЕ: Добавлен импорт useState и useEffect
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userPaymentSchema, adminBalanceAdjustmentSchema } from "@/lib/validationSchemas";
import { useAddUserPayment, useAdjustUserBalance } from "@/hooks/useAdminUsers";
import { formatBalance, getBalanceColor } from "@/lib/balanceUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, } from "@/components/ui/dialog";
// ✅ ИЗМЕНЕНИЕ: Импортируем новый компонент и иконку
import { UserBalanceHistoryDialog } from "./UserBalanceHistoryDialog";
import { History, Minus, Plus } from "lucide-react";
const PAYMENT_METHODS = ["Наличные", "Карта", "Перевод"];
export function UserPaymentDialog({ user, open, onClose, onUserUpdated }) {
    const paymentMutation = useAddUserPayment();
    const adjustmentMutation = useAdjustUserBalance();
    // ✅ ИЗМЕНЕНИЕ: Добавляем состояние для управления диалогом истории
    const [isHistoryOpen, setHistoryOpen] = useState(false);
    // ✅ ИЗМЕНЕНИЕ: Добавляем состояние для отслеживания текущего баланса
    const [currentUser, setCurrentUser] = useState(user);
    // ✅ НОВОЕ: Добавляем состояние для режима диалога
    const [dialogMode, setDialogMode] = useState('payment');
    const paymentForm = useForm({
        resolver: zodResolver(userPaymentSchema),
        mode: "onChange",
    });
    const adjustmentForm = useForm({
        resolver: zodResolver(adminBalanceAdjustmentSchema),
        mode: "onChange",
    });
    // ✅ ИЗМЕНЕНИЕ: Обновляем currentUser при изменении пропа user
    useEffect(() => {
        setCurrentUser(user);
    }, [user]);
    const onPaymentSubmit = (data) => {
        if (!user)
            return;
        paymentMutation.mutate({ userId: user.id, data }, {
            onSuccess: (updatedUser) => {
                paymentForm.reset();
                // Обновляем локальное состояние с новыми данными пользователя
                setCurrentUser(updatedUser);
                // Уведомляем родительский компонент об обновлении пользователя
                if (onUserUpdated) {
                    onUserUpdated(updatedUser);
                }
                // Показываем уведомление о успешном пополнении
                toast.success(`Баланс пополнен на ${formatMoney(data.amount)}. Новый баланс: ${formatMoney(updatedUser.balance)}`);
                // НЕ закрываем диалог автоматически - пользователь сам решит когда закончить
            },
        });
    };
    const onAdjustmentSubmit = (data) => {
        if (!user)
            return;
        adjustmentMutation.mutate({ userId: user.id, data }, {
            onSuccess: (updatedUser) => {
                adjustmentForm.reset();
                // Обновляем локальное состояние с новыми данными пользователя
                setCurrentUser(updatedUser);
                // Уведомляем родительский компонент об обновлении пользователя
                if (onUserUpdated) {
                    onUserUpdated(updatedUser);
                }
                // Показываем уведомление о успешной корректировке
                const operation = data.amount > 0 ? 'начислено' : 'списано';
                const amount = Math.abs(data.amount);
                toast.success(`С баланса ${operation} ${formatMoney(amount)}. Новый баланс: ${formatMoney(updatedUser.balance)}`);
                // НЕ закрываем диалог автоматически - пользователь сам решит когда закончить
            },
        });
    };
    const handleDialogClose = () => {
        if (paymentMutation.isPending || adjustmentMutation.isPending)
            return;
        paymentForm.reset();
        adjustmentForm.reset();
        setDialogMode('payment');
        onClose();
    };
    if (!user)
        return null;
    // ✅ ИЗМЕНЕНИЕ: Используем currentUser для отображения актуального баланса
    const displayUser = currentUser || user;
    const balanceColor = getBalanceColor(displayUser.balance);
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open, onOpenChange: handleDialogClose, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u0424\u0438\u043D\u0430\u043D\u0441\u044B" }), _jsxs(DialogDescription, { children: ["\u0412\u044B \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0435 \u0444\u0438\u043D\u0430\u043D\u0441\u0430\u043C\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ", _jsx("strong", { children: displayUser.full_name }), "."] })] }), _jsxs("div", { className: "pt-2 flex justify-between items-center", children: [_jsxs(Button, { variant: "outline", size: "sm", onClick: () => setHistoryOpen(true), children: [_jsx(History, { className: "w-4 h-4 mr-2" }), "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0431\u0430\u043B\u0430\u043D\u0441\u0430"] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: dialogMode === 'payment' ? 'default' : 'outline', size: "sm", onClick: () => setDialogMode('payment'), children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435"] }), _jsxs(Button, { variant: dialogMode === 'adjustment' ? 'default' : 'outline', size: "sm", onClick: () => setDialogMode('adjustment'), children: [_jsx(Minus, { className: "w-4 h-4 mr-2" }), "\u041A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0430"] })] })] }), _jsx("div", { className: "space-y-2 pt-4 border-t", children: _jsxs("p", { className: "text-sm text-muted-foreground", children: ["\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441:", _jsx("span", { className: `font-bold ml-2 ${balanceColor}`, children: formatBalance(displayUser.balance) })] }) }), dialogMode === 'payment' && (_jsxs("form", { onSubmit: paymentForm.handleSubmit(onPaymentSubmit), className: "space-y-4 py-2", children: [_jsx("div", { className: "space-y-2 pt-4 border-t", children: _jsx(Label, { className: "font-semibold", children: "\u041F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0431\u0430\u043B\u0430\u043D\u0441\u0430" }) }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "payment-amount", children: "\u0421\u0443\u043C\u043C\u0430 (\u20BD) *" }), _jsx(Input, { id: "payment-amount", type: "number", step: "0.01", ...paymentForm.register("amount"), placeholder: "1000" }), paymentForm.formState.errors.amount && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: paymentForm.formState.errors.amount.message }))] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "payment-method", children: "\u041C\u0435\u0442\u043E\u0434 \u043E\u043F\u043B\u0430\u0442\u044B *" }), _jsx(Controller, { name: "payment_method", control: paymentForm.control, render: ({ field }) => (_jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, children: [_jsx(SelectTrigger, { id: "payment-method", children: _jsx(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0435\u0442\u043E\u0434" }) }), _jsx(SelectContent, { children: PAYMENT_METHODS.map(method => (_jsx(SelectItem, { value: method, children: method }, method))) })] })) }), paymentForm.formState.errors.payment_method && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: paymentForm.formState.errors.payment_method.message }))] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "payment-description", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx(Textarea, { id: "payment-description", ...paymentForm.register("description"), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u043E\u043F\u043B\u0430\u0442\u0430 \u0437\u0430\u043B\u043E\u0433\u0430 \u0437\u0430 \u0430\u0440\u0435\u043D\u0434\u0443 #123" })] }), _jsxs(DialogFooter, { className: "pt-4", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: handleDialogClose, disabled: paymentMutation.isPending, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }), _jsx(Button, { type: "submit", disabled: !paymentForm.formState.isValid || paymentMutation.isPending, children: paymentMutation.isPending ? "Пополнение..." : "Пополнить баланс" })] })] })), dialogMode === 'adjustment' && (_jsxs("form", { onSubmit: adjustmentForm.handleSubmit(onAdjustmentSubmit), className: "space-y-4 py-2", children: [_jsxs("div", { className: "space-y-2 pt-4 border-t", children: [_jsx(Label, { className: "font-semibold", children: "\u041A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u043E\u0432\u043A\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0430" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u0441\u0443\u043C\u043C\u0443 \u0434\u043B\u044F \u043D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043E\u0442\u0440\u0438\u0446\u0430\u0442\u0435\u043B\u044C\u043D\u0443\u044E \u0434\u043B\u044F \u0441\u043F\u0438\u0441\u0430\u043D\u0438\u044F" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "adjustment-amount", children: "\u0421\u0443\u043C\u043C\u0430 (\u20BD) *" }), _jsx(Input, { id: "adjustment-amount", type: "number", step: "0.01", ...adjustmentForm.register("amount"), placeholder: "1000 \u0438\u043B\u0438 -1000" }), adjustmentForm.formState.errors.amount && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: adjustmentForm.formState.errors.amount.message }))] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "adjustment-description", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438 *" }), _jsx(Textarea, { id: "adjustment-description", ...adjustmentForm.register("description"), placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \u041D\u0430\u0447\u0438\u0441\u043B\u0435\u043D\u0438\u0435 \u0431\u043E\u043D\u0443\u0441\u0430 \u0437\u0430 \u043B\u043E\u044F\u043B\u044C\u043D\u043E\u0441\u0442\u044C, \u0421\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0448\u0442\u0440\u0430\u0444\u0430 \u0437\u0430 \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u043A\u0443" }), adjustmentForm.formState.errors.description && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: adjustmentForm.formState.errors.description.message }))] }), _jsxs(DialogFooter, { className: "pt-4", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: handleDialogClose, disabled: adjustmentMutation.isPending, children: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C" }), _jsx(Button, { type: "submit", disabled: !adjustmentForm.formState.isValid || adjustmentMutation.isPending, children: adjustmentMutation.isPending ? "Корректировка..." : "Выполнить корректировку" })] })] }))] }) }), _jsx(UserBalanceHistoryDialog, { user: displayUser, open: isHistoryOpen, onClose: () => setHistoryOpen(false) })] }));
}
