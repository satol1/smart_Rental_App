// src/components/admin/UserCreateDialog.tsx

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminUserCreateFormSchema, type AdminUserCreateFormSchema } from "@/lib/validationSchemas";
import { useAdminCreateUser } from "@/hooks/useAdminUsers";
import { USER_ROLE_OPTIONS, USER_ROLES } from "@/constants/userConstants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PhoneInput } from "@/components/ui/phone-input";
import { Send } from "lucide-react";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function UserCreateDialog({ open, onClose }: Props) {
    const createMutation = useAdminCreateUser();
    const { register, handleSubmit, formState: { errors, isValid }, reset, control, trigger } = useForm<AdminUserCreateFormSchema>({
        resolver: zodResolver(adminUserCreateFormSchema),
        mode: "onChange",
        defaultValues: {
            role: USER_ROLES.USER,
            privacyPolicyAccepted: true,
            termsAccepted: true,
            emailVerified: true,
        }
    });

    const onSubmit = (data: AdminUserCreateFormSchema) => {
        createMutation.mutate(data, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const handleDialogClose = () => {
        reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={handleDialogClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Новый пользователь</DialogTitle>
                    <DialogDescription>
                        Создание новой учетной записи и связанного профиля клиента.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="create-full_name">ФИО *</Label>
                        <Input id="create-full_name" {...register("full_name")} placeholder="Иван Петров" />
                        {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="create-email">Email *</Label>
                        <Input id="create-email" type="email" {...register("email")} placeholder="user@example.com" />
                        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                    </div>

                    {/* +++ НАЧАЛО: Новое поле для телефона +++ */}
                    <div>
                        <Label htmlFor="create-phone">Телефон</Label>
                        <Controller
                            name="phone"
                            control={control}
                            render={({ field }) => (
                                <PhoneInput
                                    id="create-phone"
                                    placeholder="+7 (___) ___-__-__"
                                    {...field} // Передаем все свойства поля (value, onChange, onBlur, ref)
                                    error={!!errors.phone}
                                    onBlur={() => trigger("phone")}
                                />
                            )}
                        />
                        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
                    </div>
                    {/* +++ КОНЕЦ: Новое поле для телефона +++ */}

                    {/* +++ НАЧАЛО: Новое поле для Telegram +++ */}
                    <div>
                        <Label htmlFor="create-telegram">Telegram</Label>
                        <div className="relative">
                            <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input id="create-telegram" {...register("telegram_username")} placeholder="@username" className="pl-9" />
                        </div>
                        {errors.telegram_username && <p className="text-xs text-red-600 mt-1">{errors.telegram_username.message}</p>}
                    </div>
                    {/* +++ КОНЕЦ: Новое поле для Telegram +++ */}

                    <div>
                        <Label htmlFor="create-password">Пароль *</Label>
                        <Input id="create-password" type="password" {...register("password")} placeholder="••••••••" />
                        {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="create-role">Роль *</Label>
                        <Controller
                            name="role"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger id="create-role">
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
                        {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role.message}</p>}
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={handleDialogClose}>Отмена</Button>
                        <Button type="submit" disabled={!isValid || createMutation.isPending}>
                            {createMutation.isPending ? "Создание..." : "Создать пользователя"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}