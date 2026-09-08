import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/admin/UserTable.tsx
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserSearch } from "lucide-react";
import { UserCreateDialog } from "./UserCreateDialog";
import { useUserTableLogic } from "@/hooks/admin/useUserTableLogic";
import { UserTableToolbar } from "./UserTableToolbar";
import { UserTableRow } from "./UserTableRow";
import { UserEditDialog } from "./UserEditDialog";
import { UserPaymentDialog } from "./UserPaymentDialog";
import { InfiniteScrollTrigger } from '@/components/shared/InfiniteScrollTrigger';
import { SkeletonTable } from '@/components/ui/skeleton-list';
export default function UserTable({ users, isLoading, error, onLoadMore, hasNextPage, isFetchingNextPage, onUserUpdated, }) {
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [paymentUser, setPaymentUser] = useState(null);
    const { currentUser, filteredUsers, isAdmin, searchQuery, setSearchQuery, confirmDelete, mutations, handlers, } = useUserTableLogic(users);
    const handleEdit = (user) => {
        setSelectedUser(user);
        setEditDialogOpen(true);
    };
    const handleAddPayment = (user) => {
        setPaymentUser(user);
    };
    if (isLoading) {
        return (_jsx("div", { role: "status", "aria-label": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439", children: _jsx(SkeletonTable, { rows: 8, columns: 6 }) }));
    }
    if (error) {
        return _jsx("div", { className: "text-center py-8 text-red-600", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439" });
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-4", children: [_jsx(UserTableToolbar, { searchQuery: searchQuery, onSearchChange: setSearchQuery, onAddUser: () => setCreateDialogOpen(true), filteredUserCount: filteredUsers.length, isAdmin: isAdmin }), _jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C" }), _jsx(TableHead, { children: "Email" }), _jsx(TableHead, { children: "\u0420\u043E\u043B\u044C" }), _jsx(TableHead, { children: "\u0421\u0442\u0430\u0442\u0443\u0441" }), _jsx(TableHead, { children: "\u0414\u0430\u0442\u0430 \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u0438" }), isAdmin && _jsx(TableHead, { className: "text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx(TableBody, { children: filteredUsers.length > 0 ? (filteredUsers.map((user) => (_jsx(UserTableRow, { user: user, currentUser: currentUser, isAdmin: isAdmin, confirmDeleteId: confirmDelete, handlers: handlers, mutations: mutations, onEdit: handleEdit, onAddPayment: handleAddPayment }, user.id)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: isAdmin ? 6 : 5, className: "h-24 text-center", children: _jsxs("div", { className: "flex flex-col items-center justify-center text-center p-4", children: [_jsx(UserSearch, { className: "w-16 h-16 text-gray-300 mb-3" }), _jsx("h3", { className: "text-lg font-semibold text-gray-700", children: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), _jsx("p", { className: "text-sm text-gray-500 max-w-sm", children: searchQuery
                                                            ? "Попробуйте изменить поисковый запрос."
                                                            : "В системе пока нет зарегистрированных пользователей." })] }) }) })) })] }) }), _jsx(InfiniteScrollTrigger, { fetchNextPage: onLoadMore, hasNextPage: hasNextPage, isFetchingNextPage: isFetchingNextPage }), !isAdmin && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800", children: [_jsx("strong", { children: "\u0420\u0435\u0436\u0438\u043C \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430:" }), " \u0412\u044B \u043C\u043E\u0436\u0435\u0442\u0435 \u043F\u0440\u043E\u0441\u043C\u0430\u0442\u0440\u0438\u0432\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439, \u043D\u043E \u043D\u0435 \u043C\u043E\u0436\u0435\u0442\u0435 \u0438\u0445 \u0438\u0437\u043C\u0435\u043D\u044F\u0442\u044C, \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u044F\u0442\u044C."] }))] }), _jsx(UserCreateDialog, { open: isCreateDialogOpen, onClose: () => setCreateDialogOpen(false) }), _jsx(UserEditDialog, { user: selectedUser, open: isEditDialogOpen, onClose: () => {
                    setEditDialogOpen(false);
                    setSelectedUser(null);
                } }), _jsx(UserPaymentDialog, { user: paymentUser, open: !!paymentUser, onClose: () => setPaymentUser(null), onUserUpdated: onUserUpdated })] }));
}
