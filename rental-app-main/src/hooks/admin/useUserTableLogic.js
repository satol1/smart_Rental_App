// src/hooks/admin/useUserTableLogic.ts
import { useState, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useProfile";
import { useBlockUser, useUnblockUser, useDeleteUser } from "@/hooks/useAdminUsers";
export function useUserTableLogic(users) {
    const { data: currentUser } = useCurrentUser();
    const [searchQuery, setSearchQuery] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(null);
    const blockUserMutation = useBlockUser();
    const unblockUserMutation = useUnblockUser();
    const deleteUserMutation = useDeleteUser();
    const isAdmin = currentUser?.role === "admin";
    const filteredUsers = useMemo(() => {
        return users.filter(user => user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [users, searchQuery]);
    const handleToggleBlock = (user) => {
        if (!isAdmin)
            return;
        if (user.is_active) {
            blockUserMutation.mutate(user.id);
        }
        else {
            unblockUserMutation.mutate(user.id);
        }
    };
    const handleDelete = (userId) => {
        if (!isAdmin)
            return;
        if (confirmDelete === userId) {
            deleteUserMutation.mutate(userId);
            setConfirmDelete(null);
        }
        else {
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
