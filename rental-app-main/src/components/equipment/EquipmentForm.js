import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/equipment/EquipmentForm.tsx
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { equipmentCreateSchema, equipmentUpdateExtendedSchema } from "@/lib/validationSchemas";
import { useCreateEquipment } from "@/hooks/useAdminEquipment";
import { useUpdateEquipmentDetails } from "@/hooks/useUpdateEquipmentDetails";
import { useAccessories } from "@/hooks/useAdminAccessories";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { formatDate } from "@/lib/utils";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
// Импорты подкомпонентов
import EquipmentBasicInfo from "./EquipmentBasicInfo";
import EquipmentMediaInfo from "./EquipmentMediaInfo";
import EquipmentPricingInfo from "./EquipmentPricingInfo";
import EquipmentDescriptionEditor from "./EquipmentDescriptionEditor";
import EquipmentAccessoriesSelector from "./EquipmentAccessoriesSelector";
import EquipmentAdminInfo from "./EquipmentAdminInfo";
export default function EquipmentForm({ mode, initialData, onSuccess, onCancel }) {
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
        }
        else {
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
    const form = useForm({
        resolver: zodResolver(isEditing ? equipmentUpdateExtendedSchema : equipmentCreateSchema),
        defaultValues,
        mode: "onChange",
    });
    const { handleSubmit, reset, formState: { isDirty, isValid }, } = form;
    // Форма инициализируется с правильными defaultValues
    const onSubmitHandler = async (data) => {
        try {
            if (isEditing && initialData) {
                // Режим редактирования
                const updatedData = await updateMutation.mutateAsync({
                    id: initialData.id,
                    data: data
                });
                onSuccess(updatedData);
            }
            else {
                // Режим создания
                const createdData = await createMutation.mutateAsync(data);
                onSuccess(createdData);
            }
        }
        catch (error) {
            // Ошибки обрабатываются в хуках мутаций
        }
    };
    const handleCancel = () => {
        reset();
        onCancel();
    };
    const currentMutation = isEditing ? updateMutation : createMutation;
    const isSubmitting = currentMutation.isPending;
    return (_jsx(FormProvider, { ...form, children: _jsxs("form", { onSubmit: handleSubmit(onSubmitHandler), className: "space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-4", children: [_jsx(EquipmentBasicInfo, { equipmentTypes: equipmentTypes, equipmentBrands: equipmentBrands }), _jsx(EquipmentMediaInfo, {}), _jsx(EquipmentPricingInfo, {}), _jsx(EquipmentDescriptionEditor, {}), _jsx(EquipmentAccessoriesSelector, { allAccessories: allAccessories, isLoadingAccessories: isLoadingAccessories }), _jsx(EquipmentAdminInfo, {}), _jsxs("div", { className: "flex justify-end gap-3 pt-4 border-t mt-6", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: handleCancel, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: !isValid || isSubmitting || (isEditing && !isDirty), children: isSubmitting
                                ? (isEditing ? "Сохранение..." : "Создание...")
                                : (isEditing ? "Сохранить изменения" : "Создать оборудование") })] })] }) }));
}
