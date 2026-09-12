// src/hooks/admin/useUserTableLogic.ts

import { useState, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useProfile";
import {
    useBlockUser,
    useUnblockUser,
    useDeleteUser
} from "@/hooks/useAdminUsers";
import type { UserOut } from "@/types/user";

export function useUserTableLogic(users: UserOut[], externalSearchQuery?: string) {
    const { data: currentUser } = useCurrentUser();

    // Поиск выполняется на сервере; локальный фильтр — страховка от уже загруженных страниц
    const [internalSearchQuery, setInternalSearchQuery] = useState("");
    const searchQuery = externalSearchQuery ?? internalSearchQuery;
    const setSearchQuery = externalSearchQuery !== undefined ? () => {} : setInternalSearchQuery;
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const blockUserMutation = useBlockUser();
    const unblockUserMutation = useUnblockUser();
    const deleteUserMutation = useDeleteUser();

    const isAdmin = currentUser?.role === "admin";

    const filteredUsers = useMemo(() => {
        // При серверном поиске повторная локальная фильтрация скрыла бы строки,
        // найденные по полям, которых нет в локальном предикате (например, телефон)
        if (externalSearchQuery !== undefined) return users;
        return users.filter(user =>
            user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery, externalSearchQuery]);


    const handleToggleBlock = (user: UserOut) => {
        if (!isAdmin) return;
        if (user.is_active) {
            blockUserMutation.mutate(user.id);
        } else {
            unblockUserMutation.mutate(user.id);
        }
    };

    const handleDelete = (userId: number) => {
        if (!isAdmin) return;
        if (confirmDelete === userId) {
            deleteUserMutation.mutate(userId);
            setConfirmDelete(null);
        } else {
            setConfirmDelete(userId);
            setTimeout(() => setConfirmDelete(null), 5000);
        }
    };

    return {
        currentUser,
        filteredUsers,
        isAdmin,
        searchQuery,
        setSearchQuery,
        confirmDelete,
        mutations: {
            blockUser: blockUserMutation,
            unblockUser: unblockUserMutation,
            deleteUser: deleteUserMutation,
        },
        handlers: {
            handleToggleBlock,
            handleDelete,
        },
    };
}