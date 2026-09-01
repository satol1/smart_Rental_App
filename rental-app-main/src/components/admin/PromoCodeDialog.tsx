// src/components/admin/PromoCodeDialog.tsx

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { useCreatePromoCode, useUpdatePromoCode, fetchGeneratedPromoCode } from "@/hooks/useAdminPromoCodes";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useCurrentUser } from "@/hooks/useProfile";
import type { PromoCodeOut, PromoCodeCreate } from "@/types/promo_code";
import { promoCodeFormSchema, PromoCodeFormData } from "@/lib/validationSchemas";
import { MultiSelect } from "@/components/ui/multi-select";

interface Props {
    promoCode?: PromoCodeOut | null;
    open: boolean;
    onClose: () => void;
}

export function PromoCodeDialog({ promoCode, open, onClose }: Props) {
    const { data: user } = useCurrentUser();
    const createMutation = useCreatePromoCode();
    const updateMutation = useUpdatePromoCode();

    // ✅ ИЗМЕНЕНИЕ: Используем новый хук для получения полного списка оборудования
    const { data: allEquipment = [] } = useAllEquipment();
    const { data: usersResponse, isLoading: isLoadingUsers } = useAdminUsers();

    // Аналогично поступаем с пользователями
    const users = useMemo(() => 
        usersResponse?.pages?.flatMap(page => page.items) ?? [], 
        [usersResponse]
    );


    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        formState: { errors, isValid },
    } = useForm<PromoCodeFormData>({
        resolver: zodResolver(promoCodeFormSchema) as any,
        mode: "onChange",
    });

    useEffect(() => {
        if (open) {
            if (promoCode) {
                reset({
                    code: promoCode.code,
                    description: promoCode.description ?? undefined,
                    discount_percentage: promoCode.discount_percentage,
                    is_active: promoCode.is_active,
                    valid_from: promoCode.valid_from ? new Date(promoCode.valid_from) : undefined,
                    expires_at: promoCode.expires_at ? new Date(promoCode.expires_at) : undefined,
                    max_uses: promoCode.max_uses ?? undefined,
                    max_uses_per_user: promoCode.max_uses_per_user ?? undefined,
                    min_order_amount: promoCode.min_order_amount ?? undefined,
                    specific_to_user_id: promoCode.specific_to_user_id ?? undefined,
                    applicable_to_equipment_ids: promoCode.applicable_to_equipment_ids ?? [],
                    applicable_to_equipment_types: promoCode.applicable_to_equipment_types ?? [],
                });
            } else {
                reset({
                    code: "",
                    description: "",
                    discount_percentage: 10,
                    is_active: true,
                    max_uses_per_user: 1,
                    applicable_to_equipment_ids: [],
                    applicable_to_equipment_types: [],
                });
            }
        }
    }, [promoCode, open, reset]);

    const onSubmit = (data: PromoCodeFormData) => {
        const maxDiscount = user?.role === 'admin' ? 50 : 20;
        if (data.discount_percentage > maxDiscount) {
            toast.error(`Максимальная скидка для вашей роли: ${maxDiscount}%`);
            return;
        }

        const payload = {
            ...data,
            valid_from: data.valid_from ? data.valid_from.toISOString() : null,
            expires_at: data.expires_at ? data.expires_at.toISOString() : null,
        };

        if (promoCode) {
            updateMutation.mutate({ id: promoCode.id, data: payload }, { onSuccess: onClose });
        } else {
            createMutation.mutate(payload as PromoCodeCreate, { onSuccess: onClose });
        }
    };

    const handleGenerateCode = async () => {
        const newCode = await fetchGeneratedPromoCode();
        if (newCode) {
            setValue("code", newCode, { shouldValidate: true, shouldDirty: true });
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    // ✅ ИЗМЕНЕНИЕ: Используем `allEquipment` для создания опций
    const equipmentOptions = useMemo(() => allEquipment.map(e => ({ value: e.id.toString(), label: e.name })), [allEquipment]);
    const equipmentTypeOptions = useMemo(() => [...new Set(allEquipment.map(e => e.equipment_type))].map(type => ({ value: type, label: type })), [allEquipment]);
    const userOptions = useMemo(() => users.map((u: any) => ({ value: u.id.toString(), label: `${u.full_name} (${u.email})` })), [users]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{promoCode ? "Редактировать промокод" : "Создать новый промокод"}</DialogTitle>
                    <DialogDescription>{promoCode ? `Редактирование "${promoCode.code}"` : "Заполните детали для нового промокода."}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4 pr-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="code" className="text-right">Код *</Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <Input id="code" {...register("code")} className="flex-grow" placeholder="SUMMER25"/>
                            <Button type="button" variant="outline" size="icon" onClick={handleGenerateCode} title="Сгенерировать код"><RefreshCw className="h-4 w-4" /></Button>
                        </div>
                        {errors.code && <p className="col-start-2 col-span-3 text-xs text-red-500 mt-1">{errors.code.message}</p>}
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="discount_percentage" className="text-right">Скидка, % *</Label>
                        <div className="col-span-3"><Input id="discount_percentage" type="number" {...register("discount_percentage")} /></div>
                        {errors.discount_percentage && <p className="col-start-2 col-span-3 text-xs text-red-500 mt-1">{errors.discount_percentage.message}</p>}
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Описание</Label>
                        <div className="col-span-3"><Input id="description" {...register("description")} placeholder="Для внутреннего использования"/></div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Лимиты</Label>
                        <div className="col-span-3 grid grid-cols-3 gap-2">
                            <Input type="number" {...register("max_uses")} placeholder="Всего"/>
                            <Input type="number" {...register("max_uses_per_user")} placeholder="На юзера"/>
                            <Input type="number" {...register("min_order_amount")} placeholder="Мин. сумма ₽"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Срок действия</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                            <Controller control={control} name="valid_from" render={({ field }) => (<Input type="date" onChange={(e) => field.onChange(e.target.valueAsDate)} value={field.value ? field.value.toISOString().split('T')[0] : ''}/>)} />
                            <Controller control={control} name="expires_at" render={({ field }) => (<Input type="date" onChange={(e) => field.onChange(e.target.valueAsDate)} value={field.value ? field.value.toISOString().split('T')[0] : ''}/>)} />
                        </div>
                        {errors.expires_at && <p className="col-start-2 col-span-3 text-xs text-red-500 mt-1">{errors.expires_at.message}</p>}
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Для товаров</Label>
                        <div className="col-span-3">
                            <Controller control={control} name="applicable_to_equipment_ids" render={({ field }) => (<MultiSelect placeholder="Для всего оборудования" options={equipmentOptions} value={field.value?.map(String) || []} onValueChange={(selected) => field.onChange(selected.map(Number))} />)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Для типов</Label>
                        <div className="col-span-3">
                            <Controller control={control} name="applicable_to_equipment_types" render={({ field }) => (<MultiSelect placeholder="Для всех типов" options={equipmentTypeOptions} value={field.value || []} onValueChange={field.onChange}/>)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Для юзера</Label>
                        <div className="col-span-3">
                            <Controller control={control} name="specific_to_user_id"
                                        render={({ field }) => (
                                            <Select
                                                onValueChange={(value) => field.onChange(value === 'all' ? undefined : Number(value))}
                                                value={field.value?.toString()}
                                                disabled={isLoadingUsers}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Для всех пользователей" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Для всех пользователей</SelectItem>
                                                    {userOptions.map((opt: any) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Статус</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <Controller control={control} name="is_active" render={({ field }) => (
                                <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
                            )} />
                            <Label htmlFor="is_active" className="font-normal cursor-pointer">Активен</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button type="submit" disabled={!isValid || isLoading}>
                            {isLoading ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}