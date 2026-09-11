// path: rental-app-main/src/components/admin/UserPaymentDialog.tsx
import { formatMoney } from "@/lib/money";

import { useState, useEffect } from "react"; // ✅ ИЗМЕНЕНИЕ: Добавлен импорт useState и useEffect
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userPaymentSchema, type UserPaymentSchema, adminBalanceAdjustmentSchema, type AdminBalanceAdjustmentSchema } from "@/lib/validationSchemas";
import { useAddUserPayment, useAdjustUserBalance } from "@/hooks/useAdminUsers";
import { formatBalance, getBalanceColor } from "@/lib/balanceUtils";
import type { UserOut } from "@/types/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
// ✅ ИЗМЕНЕНИЕ: Импортируем новый компонент и иконку
import { UserBalanceHistoryDialog } from "./UserBalanceHistoryDialog"; 
import { History, Minus, Plus } from "lucide-react";

const PAYMENT_METHODS = ["Наличные", "Карта", "Перевод"];

interface Props {
    user: UserOut | null;
    open: boolean;
    onClose: () => void;
    onUserUpdated?: (updatedUser: UserOut) => void;
}

type DialogMode = 'payment' | 'adjustment';

export function UserPaymentDialog({ user, open, onClose, onUserUpdated }: Props) {
    const paymentMutation = useAddUserPayment();
    const adjustmentMutation = useAdjustUserBalance();
    // ✅ ИЗМЕНЕНИЕ: Добавляем состояние для управления диалогом истории
    const [isHistoryOpen, setHistoryOpen] = useState(false);
    // ✅ ИЗМЕНЕНИЕ: Добавляем состояние для отслеживания текущего баланса
    const [currentUser, setCurrentUser] = useState<UserOut | null>(user);
    // ✅ НОВОЕ: Добавляем состояние для режима диалога
    const [dialogMode, setDialogMode] = useState<DialogMode>('payment'); 

    const paymentForm = useForm<UserPaymentSchema>({
        resolver: zodResolver(userPaymentSchema),
        mode: "onChange",
    });

    const adjustmentForm = useForm<AdminBalanceAdjustmentSchema>({
        resolver: zodResolver(adminBalanceAdjustmentSchema),
        mode: "onChange",
    });

    // ✅ ИЗМЕНЕНИЕ: Обновляем currentUser при изменении пропа user
    useEffect(() => {
        setCurrentUser(user);
    }, [user]);

    const onPaymentSubmit = (data: UserPaymentSchema) => {
        if (!user) return;

        paymentMutation.mutate({ userId: user.id, data }, {
            onSuccess: (updatedUser) => {
                paymentForm.reset();
                // Обновляем локальное состояние с новыми данными пользователя
                setCurrentUser(updatedUser);
                // Уведомляем родительский компонент об обновлении пользователя
                if (onUserUpdated) {
                    onUserUpdated(updatedUser);
                }
                // Показываем уведомление о успешном пополнении
                toast.success(`Баланс пополнен на ${formatMoney(data.amount)}. Новый баланс: ${formatMoney(updatedUser.balance)}`);
                // НЕ закрываем диалог автоматически - пользователь сам решит когда закончить
            },
        });
    };

    const onAdjustmentSubmit = (data: AdminBalanceAdjustmentSchema) => {
        if (!user) return;

        adjustmentMutation.mutate({ userId: user.id, data }, {
            onSuccess: (updatedUser) => {
                adjustmentForm.reset();
                // Обновляем локальное состояние с новыми данными пользователя
                setCurrentUser(updatedUser);
                // Уведомляем родительский компонент об обновлении пользователя
                if (onUserUpdated) {
                    onUserUpdated(updatedUser);
                }
                // Показываем уведомление о успешной корректировке
                const operation = data.amount > 0 ? 'начислено' : 'списано';
                const amount = Math.abs(data.amount);
                toast.success(`С баланса ${operation} ${formatMoney(amount)}. Новый баланс: ${formatMoney(updatedUser.balance)}`);
                // НЕ закрываем диалог автоматически - пользователь сам решит когда закончить
            },
        });
    };

    const handleDialogClose = () => {
        if (paymentMutation.isPending || adjustmentMutation.isPending) return;
        paymentForm.reset();
        adjustmentForm.reset();
        setDialogMode('payment');
        onClose();
    };

    if (!user) return null;

    // ✅ ИЗМЕНЕНИЕ: Используем currentUser для отображения актуального баланса
    const displayUser = currentUser || user;
    const balanceColor = getBalanceColor(displayUser.balance);

    return (
        <>
            <Dialog open={open} onOpenChange={handleDialogClose}>
                <DialogContent>
                    <DialogHeader>
                        {/* ✅ ИЗМЕНЕНИЕ: Заголовок переименован в "Финансы" */}
                        <DialogTitle>Финансы</DialogTitle>
                        <DialogDescription>
                            Вы управляете финансами пользователя <strong>{displayUser.full_name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {/* ✅ ИЗМЕНЕНИЕ: Добавлена кнопка "История платежей" и переключатель режимов */}
                    <div className="pt-2 flex justify-between items-center">
                        <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                            <History className="w-4 h-4 mr-2" />
                            История баланса
                        </Button>
                        
                        <div className="flex gap-2">
                            <Button
                                variant={dialogMode === 'payment' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDialogMode('payment')}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Пополнение
                            </Button>
                            <Button
                                variant={dialogMode === 'adjustment' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDialogMode('adjustment')}
                            >
                                <Minus className="w-4 h-4 mr-2" />
                                Корректировка
                            </Button>
                        </div>
                    </div>

                    {/* Отображение текущего баланса */}
                    <div className="space-y-2 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Текущий баланс:
                            <span className={`font-bold ml-2 ${balanceColor}`}>
                                {formatBalance(displayUser.balance)}
                            </span>
                        </p>
                    </div>

                    {/* Форма пополнения баланса */}
                    {dialogMode === 'payment' && (
                        <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4 py-2">
                            <div className="space-y-2 pt-4 border-t">
                                <Label className="font-semibold">Пополнение баланса</Label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="payment-amount">Сумма (₽) *</Label>
                                    <Input 
                                        id="payment-amount" 
                                        type="number" 
                                        step="0.01" 
                                        {...paymentForm.register("amount")} 
                                        placeholder="1000" 
                                    />
                                    {paymentForm.formState.errors.amount && (
                                        <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.amount.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="payment-method">Метод оплаты *</Label>
                                    <Controller
                                        name="payment_method"
                                        control={paymentForm.control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger id="payment-method">
                                                    <SelectValue placeholder="Выберите метод" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PAYMENT_METHODS.map(method => (
                                                        <SelectItem key={method} value={method}>{method}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {paymentForm.formState.errors.payment_method && (
                                        <p className="text-xs text-destructive mt-1">{paymentForm.formState.errors.payment_method.message}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="payment-description">Описание (необязательно)</Label>
                                <Textarea 
                                    id="payment-description" 
                                    {...paymentForm.register("description")} 
                                    placeholder="Например, оплата залога за аренду #123" 
                                />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={handleDialogClose} disabled={paymentMutation.isPending}>
                                    Закрыть
                                </Button>
                                <Button type="submit" disabled={!paymentForm.formState.isValid || paymentMutation.isPending}>
                                    {paymentMutation.isPending ? "Пополнение..." : "Пополнить баланс"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}

                    {/* Форма корректировки баланса */}
                    {dialogMode === 'adjustment' && (
                        <form onSubmit={adjustmentForm.handleSubmit(onAdjustmentSubmit)} className="space-y-4 py-2">
                            <div className="space-y-2 pt-4 border-t">
                                <Label className="font-semibold">Корректировка баланса</Label>
                                <p className="text-sm text-muted-foreground">
                                    Введите положительную сумму для начисления или отрицательную для списания
                                </p>
                            </div>
                            
                            <div>
                                <Label htmlFor="adjustment-amount">Сумма (₽) *</Label>
                                <Input 
                                    id="adjustment-amount" 
                                    type="number" 
                                    step="0.01" 
                                    {...adjustmentForm.register("amount")} 
                                    placeholder="1000 или -1000" 
                                />
                                {adjustmentForm.formState.errors.amount && (
                                    <p className="text-xs text-destructive mt-1">{adjustmentForm.formState.errors.amount.message}</p>
                                )}
                            </div>
                            
                            <div>
                                <Label htmlFor="adjustment-description">Описание операции *</Label>
                                <Textarea 
                                    id="adjustment-description" 
                                    {...adjustmentForm.register("description")} 
                                    placeholder="Например: Начисление бонуса за лояльность, Списание штрафа за просрочку" 
                                />
                                {adjustmentForm.formState.errors.description && (
                                    <p className="text-xs text-destructive mt-1">{adjustmentForm.formState.errors.description.message}</p>
                                )}
                            </div>
                            
                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={handleDialogClose} disabled={adjustmentMutation.isPending}>
                                    Закрыть
                                </Button>
                                <Button type="submit" disabled={!adjustmentForm.formState.isValid || adjustmentMutation.isPending}>
                                    {adjustmentMutation.isPending ? "Корректировка..." : "Выполнить корректировку"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ✅ ИЗМЕНЕНИЕ: Встроенный диалог истории платежей */}
            <UserBalanceHistoryDialog 
                user={displayUser} 
                open={isHistoryOpen} 
                onClose={() => setHistoryOpen(false)} 
            />
        </>
    );
}