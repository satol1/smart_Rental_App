// src/hooks/admin/useRentalReturnForm.ts

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useReturnRental } from "@/hooks/useAdminRentals";
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

    const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm<ReturnFormData>({
        resolver: zodResolver(returnSchema),
        mode: "onChange",
        defaultValues: {
            actual_return_date: formatDate(new Date()),
            notes_on_return: "",
        },
    });

    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(new Set());
    const [checkedAccessories, setCheckedAccessories] = useState<Set<string>>(new Set());
    const [lostAccessories, setLostAccessories] = useState<Map<string, { accessoryId: number; equipmentId: number; name: string; price: number }>>(new Map());
    
    // Состояние для платежа
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentDescription, setPaymentDescription] = useState("");
    const [paymentApplied, setPaymentApplied] = useState(false);

    // Состояние для залога
    const [depositAction, setDepositAction] = useState<'refund' | 'retain' | 'partial_retain'>('refund');
    const [depositRetainedAmount, setDepositRetainedAmount] = useState("");
    const [depositNotes, setDepositNotes] = useState("");

    // Список оборудования, которое сейчас находится в аренде (не возвращено ранее)
    const rentedEquipmentList = useMemo(() => {
        if (!rental?.equipment) return [];
        if (!rental.rental_items || rental.rental_items.length === 0) {
            return rental.equipment;
        }
        const returnedEquipmentIds = new Set(
            rental.rental_items.filter(ri => ri.status === 'returned').map(ri => ri.equipment_id)
        );
        return rental.equipment.filter(eq => !returnedEquipmentIds.has(eq.id));
    }, [rental]);

    // Список оборудования, которое уже было возвращено в рамках частичного возврата ранее
    const alreadyReturnedEquipmentList = useMemo(() => {
        if (!rental?.equipment || !rental.rental_items) return [];
        const returnedItemsMap = new Map(
            rental.rental_items.filter(ri => ri.status === 'returned').map(ri => [ri.equipment_id, ri])
        );
        return rental.equipment
            .filter(eq => returnedItemsMap.has(eq.id))
            .map(eq => ({
                ...eq,
                actual_return_date: returnedItemsMap.get(eq.id)?.actual_return_date || null
            }));
    }, [rental]);

    const totalRentedCount = rentedEquipmentList.length;
    const isPartialReturn = selectedEquipmentIds.size > 0 && selectedEquipmentIds.size < totalRentedCount;

    const handleToggleEquipment = (equipmentId: number) => {
        setSelectedEquipmentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(equipmentId)) {
                newSet.delete(equipmentId);
            } else {
                newSet.add(equipmentId);
            }
            return newSet;
        });
    };

    const handleSelectAllEquipment = () => {
        setSelectedEquipmentIds(new Set(rentedEquipmentList.map(eq => eq.id)));
    };

    const handleDeselectAllEquipment = () => {
        setSelectedEquipmentIds(new Set());
    };

    // Сумма компенсации за утерянные аксессуары (только для выбранного к возврату оборудования)
    const lostAccessoriesTotal = useMemo(() => {
        let sum = 0;
        lostAccessories.forEach((item) => {
            if (selectedEquipmentIds.has(item.equipmentId)) {
                sum += item.price || 0;
            }
        });
        return sum;
    }, [lostAccessories, selectedEquipmentIds]);

    // Динамический пересчет остатка с учетом штрафа за просрочку и утерянных аксессуаров
    const dynamicRemainingAmount = useMemo(() => {
        if (!rental) return 0;
        
        const remaining = rental.remaining_amount || 0;
        const surcharge = rental.overdue_surcharge || 0;
        const lost = lostAccessoriesTotal;
        const payment = parseFloat(paymentAmount) || 0;

        // Итоговый остаток = (Остаток по аренде) + (Штраф) + (Утерянные аксессуары) - (Внесенный платеж)
        return Math.max(0, remaining + surcharge + lost - payment);
    }, [rental, paymentAmount, lostAccessoriesTotal]);

    // Группировка аксессуаров ТОЛЬКО по выбранному для возврата оборудованию
    const accessoriesByEquipment = useMemo(() => {
        if (!rental?.accessory_links) return {};
        return rental.accessory_links.reduce((acc: Record<number, Accessory[]>, current: RentalAccessoryDetail) => {
            const equipmentId = current.equipment_id;
            if (selectedEquipmentIds.has(equipmentId)) {
                (acc[equipmentId] = acc[equipmentId] || []).push(current.accessory);
            }
            return acc;
        }, {} as Record<number, Accessory[]>);
    }, [rental, selectedEquipmentIds]);

    const totalAccessoriesCount = useMemo(() => {
        if (!rental?.accessory_links) return 0;
        return rental.accessory_links.filter(link => selectedEquipmentIds.has(link.equipment_id)).length;
    }, [rental, selectedEquipmentIds]);

    // Все аксессуары возвращаемого оборудования должны быть учтены (сданы ИЛИ помечены как утеряны)
    const allAccessoriesChecked = useMemo(() => {
        if (totalAccessoriesCount === 0) return true;
        let accountedCount = 0;
        rental?.accessory_links?.forEach(link => {
            if (selectedEquipmentIds.has(link.equipment_id)) {
                const key = `${link.equipment_id}-${link.accessory.id}`;
                if (checkedAccessories.has(key) || lostAccessories.has(key)) {
                    accountedCount++;
                }
            }
        });
        return accountedCount === totalAccessoriesCount;
    }, [rental, selectedEquipmentIds, checkedAccessories, lostAccessories, totalAccessoriesCount]);

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
        // Если был отмечен как утерянный, снимаем отметку утери
        setLostAccessories(prev => {
            if (prev.has(key)) {
                const next = new Map(prev);
                next.delete(key);
                return next;
            }
            return prev;
        });
    };

    const handleToggleLostAccessory = (equipmentId: number, accessory: Accessory) => {
        const key = `${equipmentId}-${accessory.id}`;
        setLostAccessories(prev => {
            const next = new Map(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.set(key, {
                    accessoryId: accessory.id,
                    equipmentId,
                    name: accessory.name,
                    price: accessory.price || 0,
                });
            }
            return next;
        });
        // Если был отмечен как сданный, снимаем галочку возврата
        setCheckedAccessories(prev => {
            if (prev.has(key)) {
                const next = new Set(prev);
                next.delete(key);
                return next;
            }
            return prev;
        });
    };

    const handleSelectAllAccessories = () => {
        if (!rental?.accessory_links) return;
        const newSet = new Set<string>();
        rental.accessory_links.forEach(link => {
            if (selectedEquipmentIds.has(link.equipment_id)) {
                newSet.add(`${link.equipment_id}-${link.accessory.id}`);
            }
        });
        setCheckedAccessories(newSet);
        setLostAccessories(new Map());
    };

    const handleDeselectAllAccessories = () => {
        setCheckedAccessories(new Set());
        setLostAccessories(new Map());
    };

    // Логика фиксации платежа для отправки вместе с возвратом
    const handleApplyPayment = () => {
        if (!rental || !paymentAmount) return;
        const amount = parseFloat(paymentAmount);
        if (!amount || isNaN(amount) || amount <= 0) {
            toast.error("Укажите корректную сумму платежа.");
            return;
        }
        setPaymentApplied(true);
        toast.success(`Платеж ${amount} ₽ будет проведен при подтверждении возврата.`);
    };

    // Логика отмены платежа
    const handleCancelPayment = () => {
        setPaymentAmount("");
        setPaymentDescription("");
        setPaymentApplied(false);
        toast.info("Ввод платежа отменен.");
    };

    // Автозаполнение суммы платежа с учетом штрафа за просрочку и утерянных аксессуаров
    const handleAutoFillPayment = () => {
        if (rental) {
            const remaining = rental.remaining_amount || 0;
            const surcharge = rental.overdue_surcharge || 0;
            const totalAmount = remaining + surcharge + lostAccessoriesTotal;
            setPaymentAmount(totalAmount.toString());
        }
    };

    // Автоматическое удержание стоимости утерянных аксессуаров из залога
    const handleAutoDeductLostFromDeposit = () => {
        if (!rental || !rental.deposit_amount || lostAccessoriesTotal <= 0) return;
        const depositAmount = rental.deposit_amount;
        const retainAmount = Math.min(lostAccessoriesTotal, depositAmount);
        if (retainAmount >= depositAmount) {
            setDepositAction('retain');
            setDepositRetainedAmount(depositAmount.toString());
        } else {
            setDepositAction('partial_retain');
            setDepositRetainedAmount(retainAmount.toString());
        }
        const lostNames = Array.from(lostAccessories.values()).map(a => `${a.name} (${a.price} ₽)`).join(', ');
        setDepositNotes(`Удержание за утерю аксессуаров: ${lostNames}`);
        toast.info("Сумма утери аксессуаров перенесена в удержание залога.");
    };

    useEffect(() => {
        if (rental) {
            const activeIds = rental.rental_items && rental.rental_items.length > 0
                ? rental.rental_items.filter(ri => ri.status === 'rented').map(ri => ri.equipment_id)
                : rental.equipment.map(e => e.id);
            setSelectedEquipmentIds(new Set(activeIds));
            setCheckedAccessories(new Set());
            setLostAccessories(new Map());
            setPaymentAmount("");
            setPaymentDescription("");
            setPaymentApplied(false);
            setDepositAction('refund');
            setDepositRetainedAmount("");
            setDepositNotes("");
            reset({
                actual_return_date: formatDate(new Date()),
                notes_on_return: "",
            });
        }
    }, [rental, reset]);

    const isDepositValid = useMemo(() => {
        if (!rental || !rental.deposit_amount || rental.deposit_amount <= 0) return true;
        if (depositAction === 'partial_retain') {
            const val = parseFloat(depositRetainedAmount);
            return !isNaN(val) && val >= 0 && val <= rental.deposit_amount;
        }
        return true;
    }, [rental, depositAction, depositRetainedAmount]);

    const onSubmit = (data: ReturnFormData) => {
        if (!rental) return;

        const depositAmount = rental.deposit_amount || 0;
        const depositPayload: {
            deposit_action?: string;
            deposit_retained_amount?: number;
            deposit_notes?: string;
        } = {};

        if (depositAmount > 0) {
            depositPayload.deposit_action = depositAction;
            if (depositAction === 'partial_retain') {
                depositPayload.deposit_retained_amount = parseFloat(depositRetainedAmount) || 0;
            } else if (depositAction === 'retain') {
                depositPayload.deposit_retained_amount = depositAmount;
            } else {
                depositPayload.deposit_retained_amount = 0;
            }
            if (depositNotes.trim()) {
                depositPayload.deposit_notes = depositNotes.trim();
            }
        }

        const activeLostItems = Array.from(lostAccessories.values()).filter(a => selectedEquipmentIds.has(a.equipmentId));
        const lostIds = activeLostItems.map(a => a.accessoryId);
        let returnNotes = data.notes_on_return || "";
        if (lostAccessoriesTotal > 0 && activeLostItems.length > 0) {
            const lostDetails = activeLostItems
                .map(a => `${a.name} (${a.price} ₽)`)
                .join(', ');
            const noteString = `Утерянные аксессуары: ${lostDetails} (начислено: ${lostAccessoriesTotal} ₽)`;
            returnNotes = returnNotes ? `${returnNotes} | ${noteString}` : noteString;
        }

        const parsedPayment = parseFloat(paymentAmount) || 0;
        const paymentPayload: {
            payment_amount?: number;
            payment_method?: string;
            payment_description?: string;
        } = {};

        if (parsedPayment > 0) {
            paymentPayload.payment_amount = parsedPayment;
            paymentPayload.payment_method = "cash";
            paymentPayload.payment_description = paymentDescription.trim() || `Платеж при возврате аренды #${rental.id}`;
        }

        returnMutation.mutate(
            {
                rentalId: rental.id,
                data: {
                    ...data,
                    notes_on_return: returnNotes || undefined,
                    accessories_returned_confirmation: allAccessoriesChecked,
                    equipment_ids: Array.from(selectedEquipmentIds),
                    lost_accessory_ids: lostIds.length > 0 ? lostIds : undefined,
                    lost_accessories_cost: lostAccessoriesTotal > 0 ? lostAccessoriesTotal : undefined,
                    ...depositPayload,
                    ...paymentPayload,
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
        selectedEquipmentIds,
        rentedEquipmentList,
        alreadyReturnedEquipmentList,
        isPartialReturn,
        paymentAmount,
        setPaymentAmount,
        paymentDescription,
        setPaymentDescription,
        paymentApplied,
        checkedAccessories,
        lostAccessories,
        lostAccessoriesTotal,
        dynamicRemainingAmount,
        depositAction,
        setDepositAction,
        depositRetainedAmount,
        setDepositRetainedAmount,
        depositNotes,
        setDepositNotes,
        isDepositValid,
        
        // Функции-обработчики
        handleToggleEquipment,
        handleSelectAllEquipment,
        handleDeselectAllEquipment,
        handleApplyPayment,
        handleCancelPayment,
        handleToggleAccessory,
        handleToggleLostAccessory,
        handleSelectAllAccessories,
        handleDeselectAllAccessories,
        handleAutoDeductLostFromDeposit,
        handleAutoFillPayment,
        onSubmit,
        
        // Состояния мутаций
        isSubmittingReturn: returnMutation.isPending,
        isApplyingPayment: false,
        
        // Данные формы от react-hook-form
        register,
        handleSubmit,
        formState: { errors, isValid },
        
        // Другие вычисляемые значения
        accessoriesByEquipment,
        allAccessoriesChecked,
        totalAccessoriesCount,
        hasEquipmentSelected: selectedEquipmentIds.size > 0,
    };
}
