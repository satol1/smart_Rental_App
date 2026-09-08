// src/components/admin/AccessoryDialogs.tsx
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { accessorySchema, type AccessorySchema } from "@/lib/validationSchemas";
import { useCreateAccessory, useUpdateAccessory, useAccessory } from "@/hooks/useAdminAccessories";
import type { Accessory } from "@/types/accessory";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// --- Диалог создания ---
interface CreateProps {
    open: boolean;
    onClose: () => void;
}
export function AccessoryCreateDialog({ open, onClose }: CreateProps) {
    const createMutation = useCreateAccessory();
    const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm<AccessorySchema>({
        resolver: zodResolver(accessorySchema) as Resolver<AccessorySchema>,
        mode: "onChange",
    });

    const onSubmit = (data: AccessorySchema) => {
        createMutation.mutate(data, {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Новый аксессуар</DialogTitle>
                    <DialogDescription>Создайте новую запись в каталоге аксессуаров.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* ... поля формы ... */}
                    <div>
                        <Label htmlFor="name">Название *</Label>
                        <Input id="name" {...register("name")} placeholder="Аккумулятор LP-E6" />
                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="accessory_type">Тип</Label>
                            <Input id="accessory_type" {...register("accessory_type")} placeholder="Питание"/>
                        </div>
                        <div>
                            <Label htmlFor="price">Цена (₽/день)</Label>
                            <Input id="price" type="number" step="0.01" {...register("price")} placeholder="100"/>
                            {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price.message}</p>}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="description">Описание</Label>
                        <Textarea id="description" {...register("description")} placeholder="Для камер Canon R, R5, R6..." />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button type="submit" disabled={!isValid || createMutation.isPending}>
                            {createMutation.isPending ? "Создание..." : "Создать"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Диалог редактирования ---
interface EditProps {
    accessory: Accessory | null;
    open: boolean;
    onClose: () => void;
}
export function AccessoryEditDialog({ accessory, open, onClose }: EditProps) {
    const updateMutation = useUpdateAccessory();
    const { data: accessoryData, isLoading } = useAccessory(accessory?.id || null);
    
    const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm<AccessorySchema>({
        resolver: zodResolver(accessorySchema) as Resolver<AccessorySchema>,
        mode: "onChange",
        defaultValues: {
            name: "",
            accessory_type: "",
            price: 0,
            description: "",
        },
    });

    // Обновляем форму при загрузке данных аксессуара
    useEffect(() => {
        if (accessoryData) {
            reset({
                name: accessoryData.name || "",
                accessory_type: accessoryData.accessory_type || "",
                price: accessoryData.price || 0,
                description: accessoryData.description || "",
            });
        }
    }, [accessoryData, reset]);

    const onSubmit = (data: AccessorySchema) => {
        if (!accessoryData) return;
        updateMutation.mutate({ id: accessoryData.id, data }, {
            onSuccess: () => {
                onClose();
            },
        });
    };

    if (!accessory) return null;
    
    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Редактировать аксессуар</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <p>Загрузка данных аксессуара...</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Редактировать аксессуар</DialogTitle>
                    <DialogDescription>"{accessoryData?.name || accessory.name}"</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    {/* ... поля формы ... */}
                    <div>
                        <Label htmlFor="edit-name">Название *</Label>
                        <Input id="edit-name" {...register("name")} />
                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-accessory_type">Тип</Label>
                            <Input id="edit-accessory_type" {...register("accessory_type")} />
                        </div>
                        <div>
                            <Label htmlFor="edit-price">Цена (₽/день)</Label>
                            <Input id="edit-price" type="number" step="0.01" {...register("price")} />
                            {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price.message}</p>}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="edit-description">Описание</Label>
                        <Textarea id="edit-description" {...register("description")} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button type="submit" disabled={!isValid || updateMutation.isPending}>
                            {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}