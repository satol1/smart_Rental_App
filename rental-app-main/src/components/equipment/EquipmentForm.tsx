// src/components/equipment/EquipmentForm.tsx

import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { equipmentCreateSchema, equipmentUpdateExtendedSchema, type EquipmentCreateSchema, type EquipmentUpdateExtendedSchema } from "@/lib/validationSchemas";
import { useCreateEquipment } from "@/hooks/useAdminEquipment";
import { useUpdateEquipmentDetails } from "@/hooks/useUpdateEquipmentDetails";
import { useAccessories } from "@/hooks/useAdminAccessories";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import type { Equipment } from "@/types/equipment";
import { formatDate } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";

// Импорты подкомпонентов
import EquipmentBasicInfo from "./EquipmentBasicInfo";
import EquipmentMediaInfo from "./EquipmentMediaInfo";
import EquipmentPricingInfo from "./EquipmentPricingInfo";
import EquipmentDescriptionEditor from "./EquipmentDescriptionEditor";
import EquipmentAccessoriesSelector from "./EquipmentAccessoriesSelector";
import EquipmentAdminInfo from "./EquipmentAdminInfo";

type Props = {
    mode: 'create' | 'edit';
    initialData?: Equipment;
    onSuccess: (data: Equipment) => void;
    onCancel: () => void;
    onDirtyChange?: (dirty: boolean) => void;
};

export default function EquipmentForm({ mode, initialData, onSuccess, onCancel, onDirtyChange }: Props) {
    const { data: allEquipmentData = [] } = useAllEquipment();
    const { data: allAccessories = [], isLoading: isLoadingAccessories } = useAccessories(1, 500);

    // Хуки мутаций
    const createMutation = useCreateEquipment();
    const updateMutation = useUpdateEquipmentDetails();

    const isEditing = mode === 'edit';

    // Мемоизированные данные для селектов
    const equipmentTypes = useMemo(() => {
        const types = new Set(allEquipmentData.map(e => e.equipment_type));
        // Добавляем текущие значения из initialData, если они есть
        if (initialData?.equipment_type) {
            types.add(initialData.equipment_type);
        }
        return Array.from(types).sort((a, b) => a.localeCompare(b));
    }, [allEquipmentData, initialData?.equipment_type]);

    const equipmentBrands = useMemo(() => {
        const brands = new Set(allEquipmentData.map(e => e.brand));
        // Добавляем текущие значения из initialData, если они есть
        if (initialData?.brand) {
            brands.add(initialData.brand);
        }
        return Array.from(brands).sort((a, b) => a.localeCompare(b));
    }, [allEquipmentData, initialData?.brand]);

    // Правильные defaultValues на основе режима и данных
    const defaultValues = useMemo(() => {
        if (isEditing && initialData) {
            return {
                equipment_type: initialData.equipment_type ?? "",
                brand: initialData.brand ?? "",
                name: initialData.name ?? "",
                serial_number: initialData.serial_number ?? "",
                condition: initialData.condition ?? "Великолепно",
                daily_rate: initialData.daily_rate ?? 0,
                notes: initialData.notes ?? "",
                description: initialData.description ?? "",
                last_maintenance: initialData.last_maintenance ? formatDate(initialData.last_maintenance) : "",
                short_description: initialData.short_description ?? "",
                image_url: initialData.image_url ?? "",
                image_urls: initialData.image_urls ?? [],
                accessory_ids: initialData.accessories?.map(acc => acc.id) ?? [],
            };
        } else {
            return {
                equipment_type: "",
                brand: "",
                name: "",
                serial_number: "",
                condition: "Великолепно",
                daily_rate: 0,
                notes: "",
                description: "",
                last_maintenance: "",
                short_description: "",
                image_url: "",
                image_urls: [],
                accessory_ids: [],
            };
        }
    }, [isEditing, initialData]);

    const form = useForm<EquipmentCreateSchema | EquipmentUpdateExtendedSchema>({
        resolver: zodResolver(isEditing ? equipmentUpdateExtendedSchema : equipmentCreateSchema) as Resolver<EquipmentCreateSchema | EquipmentUpdateExtendedSchema>,
        defaultValues,
        mode: "onChange",
    });

    const {
        handleSubmit,
        formState: { isDirty, isValid },
    } = form;

    // Поднимаем признак несохранённых изменений наверх (guard закрытия диалога)
    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    // Форма инициализируется с правильными defaultValues

    const onSubmitHandler = async (data: EquipmentCreateSchema | EquipmentUpdateExtendedSchema) => {
        try {
            if (isEditing && initialData) {
                // Режим редактирования
                const updatedData = await updateMutation.mutateAsync({
                    id: initialData.id,
                    data: data as EquipmentUpdateExtendedSchema
                });
                onSuccess(updatedData);
            } else {
                // Режим создания
                const createdData = await createMutation.mutateAsync(data as EquipmentCreateSchema);
                onSuccess(createdData);
            }
        } catch {
            // Ошибки обрабатываются в хуках мутаций
        }
    };

    const handleCancel = () => {
        // Диалог сам решает, закрываться ли (guard несохранённых изменений в EquipmentDialog).
        // reset() здесь запрещён: он затирал бы правки ещё ДО подтверждения закрытия.
        onCancel();
    };

    const currentMutation = isEditing ? updateMutation : createMutation;
    const isSubmitting = currentMutation.isPending;

    return (
        <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-4">
                {/* Базовая информация об оборудовании */}
                <EquipmentBasicInfo 
                    equipmentTypes={equipmentTypes}
                    equipmentBrands={equipmentBrands}
                />

                {/* Медиа информация (изображения) */}
                <EquipmentMediaInfo />

                {/* Ценообразование и состояние */}
                <EquipmentPricingInfo />

                {/* Редактор описания */}
                <EquipmentDescriptionEditor />

                {/* Селектор аксессуаров с фильтрацией */}
                <EquipmentAccessoriesSelector 
                    allAccessories={allAccessories}
                    isLoadingAccessories={isLoadingAccessories}
                />

                {/* Админские поля */}
                <EquipmentAdminInfo />

                {/* Кнопки управления формой */}
                <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                    <Button type="button" variant="ghost" onClick={handleCancel}>
                        Отмена
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={!isValid || isSubmitting || (isEditing && !isDirty)}
                    >
                        {isSubmitting 
                            ? (isEditing ? "Сохранение..." : "Создание...") 
                            : (isEditing ? "Сохранить изменения" : "Создать оборудование")
                        }
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}
