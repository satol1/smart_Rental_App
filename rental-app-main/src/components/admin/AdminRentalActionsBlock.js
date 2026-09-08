import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/AdminRentalActionsBlock.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, RotateCcw, Trash2 } from "lucide-react";
const AdminRentalActionsBlock = React.memo(({ rental, isAdmin, canRevert, isDeleting, onEdit, onReturn, onDelete, onRevert }) => {
    return (_jsxs("div", { className: "flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [canRevert && (_jsxs(Button, { size: "sm", variant: "outline", onClick: onRevert, className: "text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800", children: [_jsx(RotateCcw, { className: "mr-2 h-4 w-4" }), "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u0432\u044B\u0434\u0430\u0447\u0443"] })), _jsxs(Button, { size: "sm", variant: "outline", onClick: onEdit, children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C"] }), rental.status !== 'completed' && (_jsxs(Button, { size: "sm", variant: "default", onClick: onReturn, children: [_jsx(RotateCcw, { className: "mr-2 h-4 w-4" }), "\u041E\u0444\u043E\u0440\u043C\u0438\u0442\u044C \u0432\u043E\u0437\u0432\u0440\u0430\u0442"] }))] }), isAdmin && (_jsxs(Button, { onClick: onDelete, size: "sm", variant: "destructive", disabled: isDeleting, children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), isDeleting ? "Удаление..." : "Удалить"] }))] }));
});
AdminRentalActionsBlock.displayName = 'AdminRentalActionsBlock';
export default AdminRentalActionsBlock;
