import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/profile/DeleteBalanceHistoryDialog.tsx
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useDeleteBalanceHistory } from "@/hooks/useDeleteBalanceHistory";
export default function DeleteBalanceHistoryDialog({ isOpen, onClose, historyId, description, amount, userId }) {
    const deleteMutation = useDeleteBalanceHistory();
    const handleDelete = () => {
        if (!userId) {
            console.error("❌ UserId is required for deleting balance history entry");
            return;
        }
        console.log(`🗑️ Attempting to delete balance history entry ${historyId} for user ${userId}`);
        deleteMutation.mutate({ historyId, userId }, {
            onSuccess: () => {
                console.log(`✅ Successfully deleted balance history entry ${historyId}, closing dialog`);
                onClose();
            },
            onError: (error) => {
                console.error(`❌ Failed to delete balance history entry ${historyId}:`, error);
            }
        });
    };
    const amountSign = amount > 0 ? '+' : '';
    const formattedAmount = `${amountSign} ${amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}`;
    return (_jsx(ConfirmationDialog, { open: isOpen, onOpenChange: onClose, title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C \u0438\u0437 \u0438\u0441\u0442\u043E\u0440\u0438\u0438 \u0431\u0430\u043B\u0430\u043D\u0441\u0430", description: _jsxs("div", { className: "space-y-4", children: [_jsx("p", { children: "\u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u044D\u0442\u0443 \u0437\u0430\u043F\u0438\u0441\u044C? \u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u043E." }), _jsxs("div", { className: "bg-gray-50 p-3 rounded-md", children: [_jsxs("p", { children: [_jsx("strong", { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435:" }), " ", description] }), _jsxs("p", { children: [_jsx("strong", { children: "\u0421\u0443\u043C\u043C\u0430:" }), " ", formattedAmount] })] }), _jsx("p", { className: "text-red-600 font-medium", children: "\u26A0\uFE0F \u041F\u043E\u0441\u043B\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u0431\u0430\u043B\u0430\u043D\u0441 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0431\u0443\u0434\u0435\u0442 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043D." })] }), variant: "destructive", onConfirm: handleDelete, confirmText: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C", cancelText: "\u041E\u0442\u043C\u0435\u043D\u0430" }));
}
