import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/CancelReservationDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, // Импортируем DialogTitle
DialogDescription, // Импортируем DialogDescription
DialogFooter, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export default function CancelReservationDialog({ open, onClose, onConfirm }) {
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "text-lg font-semibold", children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435?" }) }), _jsx(DialogDescription, { className: "text-sm text-gray-600", children: "\u0412\u0441\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u044B, \u0430 \u0432\u044B \u0432\u0435\u0440\u043D\u0451\u0442\u0435\u0441\u044C \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443." }), _jsxs(DialogFooter, { className: "pt-4", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { className: "bg-red-700 hover:bg-red-800 text-white", onClick: onConfirm, children: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043E\u0442\u043C\u0435\u043D\u0443" })] })] }) }));
}
