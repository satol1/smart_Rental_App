// src/hooks/admin/useRentalReturnForm.ts

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useReturnRental } from "@/hooks/useAdminRentals";
import { useAddUserPayment } from "@/hooks/useAdminUsers";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AdminRentalOut, RentalAccessoryDetail } from "@/types/rental";
import { formatDate } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import type { Accessory } from "@/types/accessory";


interface Props {
    rental: AdminRentalOut | null;
    onClose: () => void;
}

const returnSchema = z.object({
    actual_return_date: z.string().min(1, "Дата обязательна"),
    notes_on_return: z.string().optional(),
});

type ReturnFormData = z.infer<typeof returnSchema>;

export function useRentalReturnForm({ rental, onClose }: Props) {
    const returnMutation = useReturnRental();
    const queryClient = useQueryClient();
    const paymentMutation = useAddUserPayment();
    
    const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm<ReturnFormData>({
        resolver: zodResolver(returnSchema),
        mode: "onChange",
        defaultValues: {
            actual_return_date: formatDate(new Date()),
            notes_on_return: "",
        },
    });

    const [checkedAccessories, setCheckedAccessories] = useState<Set<string>>(new Set());
    
    // Состояние для платежа
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDescription, setPaymentDescription] = useState("");
    const [paymentApplied, setPaymentApplied] = useState(false);

    // Динамический пересчет остатка с учетом штрафа за просрочку
    const dynamicRemainingAmount = useMemo(() => {
        if (!rental) return 0;
        
        const remaining = rental.remaining_amount || 0;
        const surcharge = rental.overdue_surcharge || 0;
        const payment = parseFloat(paymentAmount) || 0;

        // Итоговый остаток = (Остаток по аренде) + (Штраф) - (Внесенный платеж)
        return Math.max(0, remaining + surcharge - payment);
    }, [rental, paymentAmount]);

    // Группировка аксессуаров по оборудованию
    const accessoriesByEquipment = useMemo(() => {
        if (!rental?.accessory_links) return {};
        return rental.accessory_links.reduce((acc: Record<number, Accessory[]>, current: RentalAccessoryDetail) => {
            const equipmentId = current.equipment_id;
            (acc[equipmentId] = acc[equipmentId] || []).push(current.accessory);
            return acc;
        }, {} as Record<number, Accessory[]>);
    }, [rental]);

    const totalAccessoriesCount = rental?.accessory_links?.length ?? 0;
    const allAccessoriesChecked = checkedAccessories.size === totalAccessoriesCount;

    const handleToggleAccessory = (equipmentId: number, accessoryId: number) => {
        const key = `${equipmentId}-${accessoryId}`;
        setCheckedAccessories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    // Логика обработки платежа
    const handleApplyPayment = async () => {
        if (!rental || !paymentAmount) return;
        
        try {
            await paymentMutation.mutateAsync({
                userId: rental.user.id,
                data: {
                    amount: parseFloat(paymentAmount),
                    payment_method: "cash",
                    description: paymentDescription || `Платеж при возврате аренды #${rental.id}`
                }
            });
            
            setPaymentApplied(true);
            toast.success("Платеж успешно занесен.");
            
            // Инвалидируем запросы для обновления данных
            await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
            await queryClient.invalidateQueries({ queryKey: ["adminRentals"] });
        } catch (error) {
            console.error("Ошибка при внесении платежа:", error);
        }
    };

    // Логика отмены платежа
    const handleCancelPayment = () => {
        setPaymentAmount("");
        setPaymentDescription("");
        setPaymentApplied(false);
        toast.info("Ввод платежа отменен.");
    };

    // Автозаполнение суммы платежа с учетом штрафа за просрочку
    const handleAutoFillPayment = () => {
        if (rental) {
            const remaining = rental.remaining_amount || 0;
            const surcharge = rental.overdue_surcharge || 0;
            const totalAmount = remaining + surcharge;
            setPaymentAmount(totalAmount.toString());
        }
    };

    useEffect(() => {
        if (rental) {
            setCheckedAccessories(new Set());
            setPaymentAmount("");
            setPaymentDescription("");
            setPaymentApplied(false);
            reset({
                actual_return_date: formatDate(new Date()),
                notes_on_return: "",
            });
        }
    }, [rental, reset]);

    const onSubmit = (data: ReturnFormData) => {
        if (!rental) return;
        returnMutation.mutate(
            {
                rentalId: rental.id,
                data: {
                    ...data,
                    accessories_returned_confirmation: allAccessoriesChecked,
                }
            },
            {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            }
        );
    };

    return {
        // Состояния
        paymentAmount,
        setPaymentAmount,
        paymentDescription,
        setPaymentDescription,
        paymentApplied,
        checkedAccessories,
        dynamicRemainingAmount,
        
        // Функции-обработчики
        handleApplyPayment,
        handleCancelPayment,
        handleToggleAccessory,
        handleAutoFillPayment,
        onSubmit,
        
        // Состояния мутаций
        isSubmittingReturn: returnMutation.isPending,
        isApplyingPayment: paymentMutation.isPending,
        
        // Данные формы от react-hook-form
        register,
        handleSubmit,
        formState: { errors, isValid },
        
        // Другие вычисляемые значения
        accessoriesByEquipment,
        allAccessoriesChecked,
        totalAccessoriesCount,
    };
}
