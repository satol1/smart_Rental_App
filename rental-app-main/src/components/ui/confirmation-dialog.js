import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "./dialog";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";
export function ConfirmationDialog({ open, onOpenChange, title, description, confirmText = "Подтвердить", cancelText = "Отмена", onConfirm, onCancel, variant = "default", children, }) {
    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };
    const handleCancel = () => {
        onCancel?.();
        onOpenChange(false);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [_jsxs(DialogHeader, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [variant === "destructive" && (_jsx(AlertTriangle, { className: "h-5 w-5 text-red-500" })), _jsx(DialogTitle, { children: title })] }), _jsx(DialogDescription, { children: description })] }), children ? children : (_jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: handleCancel, children: cancelText }), _jsx(Button, { variant: variant === "destructive" ? "destructive" : "default", onClick: handleConfirm, children: confirmText })] }))] }) }));
}
