import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// path: rental-app-main/src/components/admin/UserBalanceHistoryDialog.tsx
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BalanceHistoryTable from "@/components/profile/BalanceHistoryTable";
import { formatBalance, getBalanceColor } from "@/lib/balanceUtils";
import { useAdminUser } from "@/hooks/useAdminUsers";
/**
 * Диалоговое окно для отображения истории баланса конкретного пользователя в админ-панели.
 */
export function UserBalanceHistoryDialog({ user, open, onClose }) {
    const queryClient = useQueryClient();
    // Получаем актуальные данные пользователя через хук
    const { data: currentUserData } = useAdminUser(user?.id || 0);
    // Используем актуальные данные пользователя, если они есть, иначе fallback на пропс
    // Инвалидируем кэш при открытии диалога, чтобы получить актуальные данные
    useEffect(() => {
        if (open && user) {
            queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "admin", user.id]
            });
        }
    }, [open, user, queryClient]);
    if (!user)
        return null;
    // После guard'а выше user не null; currentUserData может быть undefined
    const shownUser = currentUserData ?? user;
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "sm:max-w-4xl max-h-[80vh] flex flex-col", children: [_jsxs(DialogHeader, { className: "flex-shrink-0", children: [_jsxs(DialogTitle, { children: ["\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0431\u0430\u043B\u0430\u043D\u0441\u0430: ", shownUser.full_name] }), _jsxs(DialogDescription, { children: ["\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u0432\u0441\u0435\u0445 \u0442\u0440\u0430\u043D\u0437\u0430\u043A\u0446\u0438\u0439 \u0434\u043B\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F ", shownUser.email, "."] }), _jsx("div", { className: "mt-2", children: _jsxs("p", { className: "text-sm text-gray-600", children: ["\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0431\u0430\u043B\u0430\u043D\u0441: ", _jsx("span", { className: `font-semibold ${getBalanceColor(shownUser.balance)}`, children: formatBalance(shownUser.balance) })] }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsx(BalanceHistoryTable, { userId: user.id, isAdminView: true, useLoadMore: true }) })] }) }));
}
