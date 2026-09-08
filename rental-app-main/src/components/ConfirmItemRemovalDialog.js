import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ConfirmItemRemovalDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export default function ConfirmItemRemovalDialog({ open, onClose, onConfirm, isConfirming, variant = 'removeItem', description, }) {
    const content = {
        removeItem: {
            title: "Подтвердите действие",
            description: "Вы уверены, что хотите удалить эту позицию из резерва?",
            cancelText: "Отмена",
            confirmText: "Удалить",
            confirmLoadingText: "Удаление..."
        },
        cancelReservation: {
            title: "Удаление последней позиции",
            description: "Вы удалили последнюю позицию. Хотите отменить резерв полностью?",
            cancelText: "Вернуться к редактированию",
            confirmText: "Отменить резерв",
            confirmLoadingText: "Отмена..."
        },
        fullCancel: {
            title: "Отмена резерва",
            description: "Резерв будет отменён полностью, оборудование станет доступно другим клиентам. Действие нельзя отменить.",
            cancelText: "Оставить резерв",
            confirmText: "Отменить резерв",
            confirmLoadingText: "Отмена..."
        }
    }[variant];
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: content.title }) }), _jsx(DialogDescription, { children: description || content.description }), _jsxs(DialogFooter, { className: "pt-4", children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: isConfirming, children: content.cancelText }), _jsx(Button, { variant: "destructive", onClick: onConfirm, disabled: isConfirming, children: isConfirming ? content.confirmLoadingText : content.confirmText })] })] }) }));
}
