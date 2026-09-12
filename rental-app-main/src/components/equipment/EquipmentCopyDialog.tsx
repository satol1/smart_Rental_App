import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCopyEquipment } from "@/hooks/useAdminEquipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Equipment } from "@/types/equipment";

const copySchema = z.object({
    name: z.string().min(1, "Название обязательно"),
    serial_number: z.string().optional(),
    notes: z.string().optional(),
});

type CopyFormData = z.infer<typeof copySchema>;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    sourceEquipment: Equipment;
}

export default function EquipmentCopyDialog({ isOpen, onClose, sourceEquipment }: Props) {
    const copyMutation = useCopyEquipment();

    // Правила хуков: useForm до guard'а (иначе смена исхода guard роняет React);
    // defaultValues безопасно переживают отсутствие sourceEquipment
    const form = useForm<CopyFormData>({
        resolver: zodResolver(copySchema),
        defaultValues: {
            name: `${sourceEquipment?.name ?? ""} (копия)`,
            serial_number: "",
            notes: `Скопировано из ID: ${sourceEquipment?.id ?? "?"}`,
        },
    });

    // Защита от null/undefined
    if (!sourceEquipment) {
        return null;
    }

    const onSubmit = async (data: CopyFormData) => {
        try {
            await copyMutation.mutateAsync({
                sourceId: sourceEquipment.id,
                copyData: data,
            });
            onClose();
        } catch {
            // Ошибки обрабатываются в хуке
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Копирование оборудования</DialogTitle>
                </DialogHeader>
                <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Поля для изменения */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Название *
                                </label>
                                <Input {...form.register("name")} />
                                {form.formState.errors.name && (
                                    <p className="text-destructive text-sm mt-1">{form.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Серийный номер
                                </label>
                                <Input {...form.register("serial_number")} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Заметки
                                </label>
                                <Textarea {...form.register("notes")} rows={3} />
                            </div>
                        </div>
                        
                        {/* Read-only поля из исходного оборудования */}
                        <div className="space-y-2 p-4 bg-muted rounded">
                            <h4 className="font-medium text-foreground">Копируемые данные:</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="font-medium text-muted-foreground">Тип:</span>
                                    <span className="ml-2 text-foreground">{sourceEquipment.equipment_type}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-muted-foreground">Бренд:</span>
                                    <span className="ml-2 text-foreground">{sourceEquipment.brand}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-muted-foreground">Состояние:</span>
                                    <span className="ml-2 text-foreground">{sourceEquipment.condition}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-muted-foreground">Тариф:</span>
                                    <span className="ml-2 text-foreground">{sourceEquipment.daily_rate} ₽/день</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Отмена
                            </Button>
                            <Button type="submit" disabled={copyMutation.isPending}>
                                {copyMutation.isPending ? "Копирование..." : "Скопировать"}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    );
}
