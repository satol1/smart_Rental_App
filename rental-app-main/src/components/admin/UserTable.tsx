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
import type { UserOut } from "@/types/user";

interface UserTableProps {
    users: UserOut[];
    isLoading: boolean;
    error: unknown;
    onLoadMore: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onUserUpdated?: (updatedUser: UserOut) => void;
}

export default function UserTable({
    users,
    isLoading,
    error,
    onLoadMore,
    hasNextPage,
    isFetchingNextPage,
    onUserUpdated,
}: UserTableProps) {
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserOut | null>(null);
    const [paymentUser, setPaymentUser] = useState<UserOut | null>(null);

    const {
        currentUser,
        filteredUsers,
        isAdmin,
        searchQuery,
        setSearchQuery,
        confirmDelete,
        mutations,
        handlers,
    } = useUserTableLogic(users);

    const handleEdit = (user: UserOut) => {
        setSelectedUser(user);
        setEditDialogOpen(true);
    };

    const handleAddPayment = (user: UserOut) => {
        setPaymentUser(user);
    };

    if (isLoading) {
        return (
            <div role="status" aria-label="Загрузка пользователей">
                <SkeletonTable rows={8} columns={6} />
            </div>
        );
    }

    if (error) {
        return <div className="text-center py-8 text-destructive">Ошибка загрузки пользователей</div>;
    }

    return (
        <>
            <div className="space-y-4">
                <UserTableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onAddUser={() => setCreateDialogOpen(true)}
                    filteredUserCount={filteredUsers.length}
                    isAdmin={isAdmin}
                />

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Пользователь</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Роль</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Дата регистрации</TableHead>
                                {isAdmin && <TableHead className="text-right">Действия</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <UserTableRow
                                        key={user.id}
                                        user={user}
                                        currentUser={currentUser}
                                        isAdmin={isAdmin}
                                        confirmDeleteId={confirmDelete}
                                        handlers={handlers}
                                        mutations={mutations}
                                        onEdit={handleEdit}
                                        onAddPayment={handleAddPayment}
                                    />
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 6 : 5} className="h-24 text-center">
                                        <div className="flex flex-col items-center justify-center text-center p-4">
                                            <UserSearch className="w-16 h-16 text-muted-foreground/50 mb-3" />
                                            <h3 className="text-lg font-semibold text-foreground">Пользователи не найдены</h3>
                                            <p className="text-sm text-muted-foreground max-w-sm">
                                                {searchQuery
                                                    ? "Попробуйте изменить поисковый запрос."
                                                    : "В системе пока нет зарегистрированных пользователей."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <InfiniteScrollTrigger
                    fetchNextPage={onLoadMore}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                />

                {!isAdmin && (
                    <div className="bg-info-soft border border-primary/25 rounded-lg p-4 text-sm text-primary">
                        <strong>Режим менеджера:</strong> Вы можете просматривать список пользователей, но не можете их изменять, блокировать или удалять.
                    </div>
                )}
            </div>

            <UserCreateDialog open={isCreateDialogOpen} onClose={() => setCreateDialogOpen(false)} />

            <UserEditDialog
                user={selectedUser}
                open={isEditDialogOpen}
                onClose={() => {
                    setEditDialogOpen(false);
                    setSelectedUser(null);
                }}
            />

            <UserPaymentDialog
                user={paymentUser}
                open={!!paymentUser}
                onClose={() => setPaymentUser(null)}
                onUserUpdated={onUserUpdated}
            />
        </>
    );
}