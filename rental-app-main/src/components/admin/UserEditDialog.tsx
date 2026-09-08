// src/components/admin/UserEditDialog.tsx

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminUserUpdateSchema, type AdminUserUpdateSchema } from "@/lib/validationSchemas";
import { useAdminUpdateUser } from "@/hooks/useAdminUsers";
import { useCurrentUser } from "@/hooks/useProfile";
import { USER_ROLE_OPTIONS } from "@/constants/userConstants";
import { USER_STATUS_OPTIONS, USER_STATUS } from "@/constants/userStatusConstants";
import type { UserOut } from "@/types/user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { Send } from "lucide-react";

interface Props {
    user: UserOut | null;
    open: boolean;
    onClose: () => void;
}

// Используем новые статусы из констант
const statusOptions = USER_STATUS_OPTIONS;

export function UserEditDialog({ user, open, onClose }: Props) {
    const { data: currentUser } = useCurrentUser();
    const isAdmin = currentUser?.role === 'admin';
    const updateMutation = useAdminUpdateUser();

    // Проверка прав на изменение статуса "Персона НонГрата" (только админ)
    const canChangePersonaNonGrata = (newStatus: string, currentStatus?: string | null): boolean => {
        if (newStatus === USER_STATUS.PERSONA_NON_GRATA || currentStatus === USER_STATUS.PERSONA_NON_GRATA) {
            return isAdmin;
        }
        return true; // Менеджер может менять другие статусы
    };

    const { register, handleSubmit, formState: { errors, isValid, isDirty }, reset, control } = useForm<AdminUserUpdateSchema>({
        resolver: zodResolver(adminUserUpdateSchema),
        mode: "onChange",
        // Устанавливаем значения по умолчанию СРАЗУ
        defaultValues: {
            full_name: user?.full_name || "",
            phone: user?.phone || "",
            telegram_username: user?.telegram_username || "",
            status: user?.status || USER_STATUS.NEW,
            notes: user?.notes || "",
            balance: user?.balance || 0,
            role: user?.role,
        }
    });

    // Этот useEffect нужен для обновления формы, если объект user изменится
    useEffect(() => {
        if (user && open) {
            const formData = {
                full_name: user.full_name,
                phone: user.phone || "",
                telegram_username: user.telegram_username || "",
                status: user.status || USER_STATUS.NEW,
                notes: user.notes || "",
                balance: user.balance,
                role: user.role,
            };
            reset(formData);
        }
    }, [user, open, reset]); // Добавляем reset в массив зависимостей


    const onSubmit = (data: AdminUserUpdateSchema) => {
        if (!user) return;
        
        // Проверка прав на изменение статуса "Персона НонГрата"
        if (data.status && !canChangePersonaNonGrata(data.status, user.status)) {
            // Это должно быть обработано через валидацию формы, но добавим проверку на всякий случай
            return;
        }
        
        updateMutation.mutate({ userId: user.id, data }, {
            onSuccess: () => {
                onClose();
            },
        });
    };

    if (!user) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Редактирование профиля</DialogTitle>
                        <DialogDescription>
                            Вы изменяете данные пользователя: <strong>{user.full_name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                        <div>
                            <Label htmlFor="edit-email">Email (нельзя изменить)</Label>
                            <Input id="edit-email" value={user.email} disabled />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-full_name">ФИО *</Label>
                                <Input id="edit-full_name" {...register("full_name")} />
                                {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="edit-phone">Телефон</Label>
                                {/* ✅ ИЗМЕНЕНИЕ: Оборачиваем PhoneInput в Controller для стабильной работы */}
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field }) => (
                                        <PhoneInput id="edit-phone" {...field} />
                                    )}
                                />
                                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="edit-telegram">Telegram</Label>
                            <div className="relative">
                                <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input id="edit-telegram" {...register("telegram_username")} placeholder="@username" className="pl-9" />
                            </div>
                            {errors.telegram_username && <p className="text-xs text-red-600 mt-1">{errors.telegram_username.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-role">Роль</Label>
                                <Controller
                                    name="role"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={!isAdmin}
                                        >
                                            <SelectTrigger id="edit-role">
                                                <SelectValue placeholder="Выберите роль" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {USER_ROLE_OPTIONS.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {!isAdmin && <p className="text-xs text-gray-500 mt-1">Только админ может менять роль.</p>}
                            </div>
                            <div>
                                <Label htmlFor="edit-status">Статус</Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => {
                                        const currentValue = field.value || user?.status || "";
                                        const isPersonaNonGrataRestricted = 
                                            (currentValue === USER_STATUS.PERSONA_NON_GRATA || field.value === USER_STATUS.PERSONA_NON_GRATA) && !isAdmin;
                                        
                                        return (
                                            <>
                                                <Select 
                                                    onValueChange={(value) => {
                                                        if (canChangePersonaNonGrata(value, user?.status)) {
                                                            field.onChange(value);
                                                        }
                                                    }} 
                                                    value={field.value}
                                                    disabled={isPersonaNonGrataRestricted}
                                                >
                                                    <SelectTrigger id="edit-status">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {statusOptions.map(option => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {isPersonaNonGrataRestricted && (
                                                    <p className="text-xs text-amber-600 mt-1">
                                                        Только админ может изменять статус "Персона НонГрата"
                                                    </p>
                                                )}
                                            </>
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="edit-balance">Баланс</Label>
                            <Input id="edit-balance" type="number" step="0.01" {...register("balance")} placeholder="0.00" />
                            {errors.balance && <p className="text-xs text-red-600 mt-1">{errors.balance.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="edit-notes">Заметки (видны только персоналу)</Label>
                            <Textarea id="edit-notes" {...register("notes")} placeholder="Внутренняя информация о клиенте..." />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                            <Button type="submit" disabled={!isDirty || !isValid || updateMutation.isPending}>
                                {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </>
    );
}