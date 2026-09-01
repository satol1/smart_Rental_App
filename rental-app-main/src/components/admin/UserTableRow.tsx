// src/components/admin/UserTableRow.tsx

import type { UserOut } from "@/types/user";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldCheck, UserCheck, UserX, Trash2, Pencil, DollarSign } from "lucide-react";
import type { useUserTableLogic } from "@/hooks/admin/useUserTableLogic";
import { USER_ROLE_LABELS, USER_ROLE_BADGE_VARIANTS } from "@/constants/userConstants";
import { USER_STATUS_BADGE_VARIANTS, USER_STATUS_COLORS, USER_STATUS } from "@/constants/userStatusConstants";
import { formatDateEuropean } from "@/lib/utils";

type Handlers = ReturnType<typeof useUserTableLogic>['handlers'];
type Mutations = ReturnType<typeof useUserTableLogic>['mutations'];

interface Props {
    user: UserOut;
    currentUser: UserOut | null | undefined;
    isAdmin: boolean;
    confirmDeleteId: number | null;
    handlers: Handlers;
    mutations: Mutations;
    onEdit: (user: UserOut) => void;
    onAddPayment: (user: UserOut) => void;
}

export function UserTableRow({ user, currentUser, isAdmin, confirmDeleteId, handlers, mutations, onEdit, onAddPayment }: Props) {
    return (
        <TableRow key={user.id}>
            <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    {user.role === "admin" && <ShieldCheck className="w-4 h-4 text-red-500" />}
                    {user.role === "manager" && <Shield className="w-4 h-4 text-blue-500" />}
                    {user.full_name}
                    {user.id === currentUser?.id && <Badge variant="outline" className="text-xs">Это вы</Badge>}
                </div>
            </TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
                <Badge variant={USER_ROLE_BADGE_VARIANTS[user.role]}>
                    {USER_ROLE_LABELS[user.role]}
                </Badge>
            </TableCell>
            <TableCell>
                {user.status && Object.values(USER_STATUS).includes(user.status as typeof USER_STATUS[keyof typeof USER_STATUS]) ? (
                    <Badge 
                        variant={USER_STATUS_BADGE_VARIANTS[user.status as typeof USER_STATUS[keyof typeof USER_STATUS]] || "secondary"}
                        className={USER_STATUS_COLORS[user.status as typeof USER_STATUS[keyof typeof USER_STATUS]] || ""}
                    >
                        {user.status}
                    </Badge>
                ) : (
                    <Badge variant="secondary">Новый</Badge>
                )}
            </TableCell>
            <TableCell className="text-sm text-gray-600">
                {formatDateEuropean(user.created_at)}
            </TableCell>
            {isAdmin && (
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                        {user.id !== currentUser?.id ? (
                            <>
                                <Button variant="outline" size="icon" onClick={() => onAddPayment(user)} className="h-8 w-8 text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700">
                                    <DollarSign className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => onEdit(user)} className="h-8 w-8">
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handlers.handleToggleBlock(user)} disabled={mutations.blockUser.isPending || mutations.unblockUser.isPending}>
                                    {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
                                <Button variant={confirmDeleteId === user.id ? "destructive" : "outline"} size="sm" onClick={() => handlers.handleDelete(user.id)} disabled={mutations.deleteUser.isPending}>
                                    <Trash2 className="w-4 h-4" />
                                    {confirmDeleteId === user.id && <span className="ml-1 text-xs">Подтвердить</span>}
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" size="icon" onClick={() => onAddPayment(user)} className="h-8 w-8 text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700">
                                <DollarSign className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
}