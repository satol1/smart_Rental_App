import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/UserTableToolbar.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
export function UserTableToolbar({ searchQuery, onSearchChange, onAddUser, filteredUserCount, isAdmin }) {
    return (_jsxs("div", { className: "flex flex-col sm:flex-row gap-4 items-center justify-between", children: [_jsxs("div", { className: "relative flex-grow max-w-sm w-full", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx(Input, { placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439...", value: searchQuery, onChange: (e) => onSearchChange(e.target.value), className: "pl-10" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("p", { className: "text-sm text-gray-600", children: ["\u041D\u0430\u0439\u0434\u0435\u043D\u043E: ", filteredUserCount] }), isAdmin && (_jsxs(Button, { size: "sm", onClick: onAddUser, children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C"] }))] })] }));
}
