import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/AdminReservationToolbar.tsx
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';
import { useAdminReservationSelectionStore } from '@/store/adminReservationSelectionStore';
export function AdminReservationToolbar({ visibleReservationIds, onBulkDelete, isDeleting }) {
    const { selectedIds, setSelectedIds, clearSelection } = useAdminReservationSelectionStore();
    const isAllSelected = visibleReservationIds.length > 0 && selectedIds.length === visibleReservationIds.length;
    const isSomeSelected = selectedIds.length > 0 && selectedIds.length < visibleReservationIds.length;
    const handleSelectAll = (checked) => {
        if (checked === true) {
            setSelectedIds(visibleReservationIds);
        }
        else {
            clearSelection();
        }
    };
    return (_jsxs("div", { className: "flex items-center gap-4 p-3 bg-slate-50 border rounded-md mb-4 h-14", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Checkbox, { id: "select-all", checked: isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false), onCheckedChange: handleSelectAll, "aria-label": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u0435 \u0432\u0438\u0434\u0438\u043C\u044B\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u044B" }), _jsx("label", { htmlFor: "select-all", className: "text-sm font-medium text-slate-700 cursor-pointer", children: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u0435" })] }), selectedIds.length > 0 && (_jsxs("div", { className: "flex items-center gap-4 animate-in fade-in-0 duration-300", children: [_jsxs("span", { className: "text-sm text-slate-500", children: ["\u0412\u044B\u0431\u0440\u0430\u043D\u043E: ", selectedIds.length] }), _jsxs(Button, { size: "sm", variant: "destructive", onClick: onBulkDelete, disabled: isDeleting, children: [_jsx(Trash2, { className: "w-4 h-4 mr-2" }), isDeleting ? 'Удаление...' : 'Удалить выбранное'] })] }))] }));
}
