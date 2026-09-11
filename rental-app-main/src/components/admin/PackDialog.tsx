// src/components/admin/PackDialog.tsx

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Loader2 } from "lucide-react";
import { useCreatePack, useUpdatePack, useSuggestPackItems } from "@/hooks/useAdminPacks";
import { useAllEquipment } from "@/hooks/useAllEquipment";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import type { Pack } from "@/types/pack";

const packSchema = z.object({
    name: z.string().min(1, "Название пачки обязательно"),
    description: z.string().optional(),
    equipment_ids: z.array(z.number()).min(1, "Выберите хотя бы одно оборудование"),
});

type PackFormData = z.infer<typeof packSchema>;

interface PackDialogProps {
    open: boolean;
    onClose: () => void;
    pack?: Pack | null;
}

export default function PackDialog({ open, onClose, pack }: PackDialogProps) {
    const isEditing = !!pack;
    const createPackMutation = useCreatePack();
    const updatePackMutation = useUpdatePack();
    const suggestItemsMutation = useSuggestPackItems();
    const { data: allEquipment, isLoading: isLoadingEquipment } = useAllEquipment();

    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
        reset,
        setValue,
        watch,
        control,
    } = useForm<PackFormData>({
        resolver: zodResolver(packSchema),
        defaultValues: {
            name: "",
            description: "",
            equipment_ids: [],
        },
        mode: "onChange",
    });

    const selectedEquipmentIds = watch("equipment_ids");

    // Подготавливаем опции для MultiSelect
    const equipmentOptions = useMemo(() => {
        if (!allEquipment) return [];
        
        return allEquipment.map((equipment) => ({
            label: `${equipment.brand} ${equipment.name} (ID: ${equipment.id})`,
            value: equipment.id.toString(),
        }));
    }, [allEquipment]);

    // Заполняем форму при редактировании
    useEffect(() => {
        if (pack && open) {
            reset({
                name: pack.name,
                description: pack.description || "",
                equipment_ids: pack.equipment.map(eq => eq.id),
            });
        } else if (!pack && open) {
            reset({
                name: "",
                description: "",
                equipment_ids: [],
            });
        }
    }, [pack, open, reset]);

    const onSubmit = async (data: PackFormData) => {
        try {
            if (isEditing && pack) {
                await updatePackMutation.mutateAsync({
                    id: pack.id,
                    data: {
                        name: data.name,
                        description: data.description,
                        equipment_ids: data.equipment_ids,
                    },
                });
            } else {
                await createPackMutation.mutateAsync({
                    name: data.name,
                    description: data.description,
                    equipment_ids: data.equipment_ids,
                });
            }
            reset();
            onClose();
        } catch (error) {
            // Ошибка обработается в хуке
        }
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSuggestItems = async () => {
        if (selectedEquipmentIds.length === 0) return;
        
        try {
            const suggestions = await suggestItemsMutation.mutateAsync(selectedEquipmentIds[0]);
            // Добавляем предложения к уже выбранным элементам
            const newEquipmentIds = [...new Set([...selectedEquipmentIds, ...suggestions])];
            setValue("equipment_ids", newEquipmentIds, { shouldValidate: true });
        } catch (error) {
            // Ошибка обработается в хуке
        }
    };

    const isLoading = createPackMutation.isPending || updatePackMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? "Редактировать пачку" : "Создать новую пачку"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Название пачки */}
                    <div>
                        <Label htmlFor="name">Название пачки *</Label>
                        <Input
                            id="name"
                            {...register("name")}
                            placeholder="Например: Комплект для видеосъемки"
                        />
                        {errors.name && (
                            <p className="text-xs text-destructive mt-1">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Описание */}
                    <div>
                        <Label htmlFor="description">Описание</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Описание пачки, что входит в комплект..."
                            rows={3}
                        />
                    </div>

                    {/* Выбор оборудования */}
                    <div>
                        <Label htmlFor="equipment_ids">Оборудование в пачке *</Label>
                        <div className="space-y-2">
                            <Controller
                                name="equipment_ids"
                                control={control}
                                render={({ field }) => (
                                    <MultiSelect
                                        placeholder={
                                            isLoadingEquipment 
                                                ? "Загрузка оборудования..." 
                                                : "Выберите оборудование для пачки"
                                        }
                                        options={equipmentOptions}
                                        value={field.value.map(id => id.toString())}
                                        onValueChange={(values) => 
                                            field.onChange(values.map(v => parseInt(v)))
                                        }
                                        disabled={isLoadingEquipment}
                                        maxCount={10}
                                    />
                                )}
                            />
                            
                            {/* Кнопка "Найти похожие" */}
                            <div className="flex justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSuggestItems}
                                    disabled={
                                        selectedEquipmentIds.length === 0 || 
                                        suggestItemsMutation.isPending
                                    }
                                >
                                    {suggestItemsMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Поиск...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-4 h-4 mr-2" />
                                            Найти похожие
                                        </>
                                    )}
                                </Button>
                            </div>
                            
                            {errors.equipment_ids && (
                                <p className="text-xs text-destructive mt-1">
                                    {errors.equipment_ids.message}
                                </p>
                            )}
                            
                            {selectedEquipmentIds.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Выбрано единиц оборудования: {selectedEquipmentIds.length}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {isEditing ? "Сохранение..." : "Создание..."}
                                </>
                            ) : (
                                isEditing ? "Сохранить изменения" : "Создать пачку"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
