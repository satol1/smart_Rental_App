// src/components/admin/AssociationTable.tsx

import { useState, useMemo, useEffect } from "react";
import { useAdminAssociations, useCreateAssociation, useUpdateAssociation, useDeleteAssociation } from "@/hooks/useAdminAssociations";
// ❌ УДАЛЕНО: Больше не используем пагинированный хук для оборудования
// import { useEquipment } from "@/hooks/useEquipment";
// ✅ ДОБАВЛЕНО: Используем хук, который загружает ПОЛНЫЙ список оборудования для нашего "справочника"
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Association } from "@/types/association";
// ❌ УДАЛЕНО: Этот тип больше не нужен, так как мы не работаем с пагинацией здесь
// import type { EquipmentListResponse } from "@/core/services/EquipmentService";

// UI Components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Tags, Loader2 } from "lucide-react";

const associationSchema = z.object({
    name: z.string().min(3, "Название обязательно"),
    description: z.string().optional(),
    sort_order: z.coerce.number(),
    equipment_ids: z.array(z.number()),
});
type AssociationFormData = z.infer<typeof associationSchema>;

// --- Компонент диалогового окна (без изменений в логике) ---
function AssociationDialog({ open, onClose, association, allEquipment }: {
    open: boolean;
    onClose: () => void;
    association: Association | null;
    allEquipment: { value: string, label: string }[];
}) {
    const createMutation = useCreateAssociation();
    const updateMutation = useUpdateAssociation();

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors, isValid },
    } = useForm<AssociationFormData>({
        resolver: zodResolver(associationSchema),
        mode: "onChange",
    });

    useEffect(() => {
        if (open) {
            reset({
                name: association?.name ?? "",
                description: association?.description ?? "",
                sort_order: association?.sort_order ?? 0,
                equipment_ids: association?.equipment_ids ?? [],
            });
        }
    }, [association, open, reset]);

    const onSubmit = (data: AssociationFormData) => {
        const handleSuccess = () => {
            reset();
            onClose();
        };

        if (association) {
            updateMutation.mutate({ id: association.id, data }, { onSuccess: handleSuccess });
        } else {
            createMutation.mutate(data, { onSuccess: handleSuccess });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{association ? "Редактировать ассоциацию" : "Новая ассоциация"}</DialogTitle>
                    <DialogDescription>
                        {association ? `Редактирование "${association.name}"` : "Создайте новую подборку оборудования."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div>
                        <Label htmlFor="assoc-name">Название *</Label>
                        <Input id="assoc-name" {...register("name")} placeholder="Набор для стриминга" />
                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="assoc-sort">Порядок сортировки</Label>
                        <Input id="assoc-sort" type="number" {...register("sort_order")} />
                    </div>
                    <div>
                        <Label>Оборудование в подборке</Label>
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
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button type="submit" disabled={!isValid || createMutation.isPending || updateMutation.isPending}>
                            {createMutation.isPending || updateMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Основной компонент таблицы ---
export default function AssociationTable() {
    const { data: associations = [], isLoading } = useAdminAssociations();
    // ✅ ИЗМЕНЕНО: Загружаем весь список оборудования один раз.
    const { data: allEquipment = [] } = useAllEquipment();
    const deleteMutation = useDeleteAssociation();

    // ✅ ИЗМЕНЕНО: Преобразуем полный список в формат для выпадающего меню.
    const equipmentOptions = useMemo(() =>
            allEquipment.map(e => ({ value: e.id.toString(), label: e.name })),
        [allEquipment]
    );

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [editingAssoc, setEditingAssoc] = useState<Association | null>(null);

    const handleEdit = (assoc: Association) => { setEditingAssoc(assoc); setDialogOpen(true); };
    const handleCreate = () => { setEditingAssoc(null); setDialogOpen(true); };
    const handleDelete = (id: number) => { if (window.confirm("Удалить ассоциацию?")) deleteMutation.mutate(id); };

    if (isLoading) return <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Загрузка...</div>;

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={handleCreate}><Plus className="mr-2 h-4 w-4" /> Создать</Button>
            </div>
            {associations.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Порядок</TableHead>
                            <TableHead>Название</TableHead>
                            <TableHead>Кол-во ед.</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {associations.map((assoc) => (
                            <TableRow key={assoc.id}>
                                <TableCell>{assoc.sort_order}</TableCell>
                                <TableCell className="font-medium">{assoc.name}</TableCell>
                                <TableCell>{assoc.equipment_ids.length}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(assoc)} aria-label="Редактировать ассоциацию"><Edit className="h-4 w-4" aria-hidden="true" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(assoc.id)} aria-label="Удалить ассоциацию"><Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <div className="text-center py-10 border-dashed border-2 rounded-lg">
                    <Tags className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-800">Ассоциации не созданы</h3>
                    <p className="mt-1 text-sm text-gray-500">Нажмите "Создать", чтобы добавить первую.</p>
                </div>
            )}
            {/* ✅ Теперь в диалог гарантированно передается ПОЛНЫЙ список оборудования */}
            {isDialogOpen && <AssociationDialog open={isDialogOpen} onClose={() => setDialogOpen(false)} association={editingAssoc} allEquipment={equipmentOptions} />}
        </>
    );
}