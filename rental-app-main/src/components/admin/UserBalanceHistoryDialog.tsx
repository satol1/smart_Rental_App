// path: rental-app-main/src/components/admin/UserBalanceHistoryDialog.tsx

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BalanceHistoryTable from "@/components/profile/BalanceHistoryTable";
import type { UserOut } from "@/types/user";
import { formatBalance, getBalanceColor } from "@/lib/balanceUtils";
import { useAdminUser } from "@/hooks/useAdminUsers";

interface Props {
    user: UserOut | null;
    open: boolean;
    onClose: () => void;
}

/**
 * Диалоговое окно для отображения истории баланса конкретного пользователя в админ-панели.
 */
export function UserBalanceHistoryDialog({ user, open, onClose }: Props) {
    const queryClient = useQueryClient();
    
    // Получаем актуальные данные пользователя через хук
    const { data: currentUserData } = useAdminUser(user?.id || 0);
    
    // Используем актуальные данные пользователя, если они есть, иначе fallback на пропс

    // Инвалидируем кэш при открытии диалога, чтобы получить актуальные данные
    useEffect(() => {
        if (open && user) {
            queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "admin", user.id]
            });
        }
    }, [open, user, queryClient]);

    if (!user) return null;

    // После guard'а выше user не null; currentUserData может быть undefined
    const shownUser: UserOut = currentUserData ?? user;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle>История баланса: {shownUser.full_name}</DialogTitle>
                    <DialogDescription>
                        Просмотр всех транзакций для пользователя {shownUser.email}.
                    </DialogDescription>
                    <div className="mt-2">
                        <p className="text-sm text-muted-foreground">
                            Текущий баланс: <span className={`font-semibold ${getBalanceColor(shownUser.balance)}`}>
                                {formatBalance(shownUser.balance)}
                            </span>
                        </p>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                    <BalanceHistoryTable userId={user.id} isAdminView={true} useLoadMore={true} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
