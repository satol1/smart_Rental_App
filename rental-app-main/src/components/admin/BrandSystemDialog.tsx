// src/components/admin/BrandSystemDialog.tsx

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateBrandSystem, useUpdateBrandSystem } from "@/hooks/useAdminBrandSystems";
import type { BrandSystem } from "@/types/brandSystem";

// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";

const brandSystemSchema = z.object({
    name: z.string().min(2, "Название должно содержать минимум 2 символа").max(100, "Название не должно превышать 100 символов"),
    description: z.string().optional(),
    equipment_ids: z.array(z.number()),
});

type BrandSystemFormData = z.infer<typeof brandSystemSchema>;

interface BrandSystemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    brandSystem: BrandSystem | null;
    allEquipment: { value: string; label: string }[];
}

export default function BrandSystemDialog({ isOpen, onClose, brandSystem, allEquipment }: BrandSystemDialogProps) {
    const createMutation = useCreateBrandSystem();
    const updateMutation = useUpdateBrandSystem();

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isValid },
    } = useForm<BrandSystemFormData>({
        resolver: zodResolver(brandSystemSchema),
        mode: "onChange",
    });

    useEffect(() => {
        if (isOpen) {
            reset({
                name: brandSystem?.name ?? "",
                description: brandSystem?.description ?? "",
                equipment_ids: brandSystem?.equipment_ids ?? [],
            });
        }
    }, [brandSystem, isOpen, reset]);

    const onSubmit = (data: BrandSystemFormData) => {
        const handleSuccess = () => {
            reset();
            onClose();
        };

        if (brandSystem) {
            updateMutation.mutate({ id: brandSystem.id, data }, { onSuccess: handleSuccess });
        } else {
            createMutation.mutate(data, { onSuccess: handleSuccess });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {brandSystem ? "Редактировать систему бренда" : "Новая система бренда"}
                    </DialogTitle>
                    <DialogDescription>
                        {brandSystem 
                            ? `Редактирование "${brandSystem.name}"` 
                            : "Создайте новую систему бренда для группировки совместимого оборудования."
                        }
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="brand-name">Название *</Label>
                        <Input 
                            id="brand-name" 
                            {...register("name")} 
                            placeholder="Например: Canon" 
                        />
                        {errors.name && (
                            <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
                        )}
                    </div>
                    
                    <div>
                        <Label htmlFor="brand-description">Описание</Label>
                        <Textarea 
                            id="brand-description" 
                            {...register("description")} 
                            placeholder="Внутреннее описание для администратора (необязательно)"
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>
                        )}
                    </div>
                    
                    <div>
                        <Label>Совместимое оборудование</Label>
                        <Controller
                            name="equipment_ids"
                            control={control}
                            render={({ field }) => (
                                <MultiSelect
                                    placeholder="Выберите оборудование..."
                                    options={allEquipment}
                                    value={field.value.map(String)}
                                    onValueChange={(selected) => field.onChange(selected.map(Number))}
                                />
                            )}
                        />
                        {errors.equipment_ids && (
                            <p className="text-xs text-red-600 mt-1">{errors.equipment_ids.message}</p>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Отмена
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={!isValid || createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending 
                                ? "Сохранение..." 
                                : "Сохранить"
                            }
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
