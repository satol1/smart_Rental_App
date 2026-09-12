// src/components/admin/AddEquipmentToRentalDialog.tsx

import { useState, useMemo, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyText } from "@/components/ui/money-text";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, PackagePlus, Loader2, Info } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";
import type { Equipment } from "@/types/equipment";
import type { Accessory } from "@/types/accessory";
import type { AvailabilityInfo } from "@/types/availability";
import { useAllEquipment } from "@/hooks/useAllEquipment";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { useAddEquipmentToRental } from "@/hooks/useAdminRentals";
import { formatDateEuropean } from "@/lib/utils";
import { formatBalance, getBalanceColor } from "@/lib/balanceUtils";

interface Props {
    rental: AdminRentalOut | null;
    open: boolean;
    onClose: () => void;
}

export default function AddEquipmentToRentalDialog({ rental, open, onClose }: Props) {
    const [search, setSearch] = useState("");
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<number>>(new Set());
    const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<Set<number>>(new Set());

    const { data: allEquipment = [], isLoading: isLoadingEquipment } = useAllEquipment();
    const addEquipmentMutation = useAddEquipmentToRental();

    // Сброс состояния при открытии/закрытии или смене аренды
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedEquipmentIds(new Set());
            setSelectedAccessoryIds(new Set());
        }
    }, [open, rental?.id]);

    // Существующие в аренде активные позиции оборудования
    const existingActiveEquipmentIds = useMemo(() => {
        if (!rental) return new Set<number>();
        if (rental.rental_items && rental.rental_items.length > 0) {
            return new Set(
                rental.rental_items
                    .filter((ri) => ri.status !== "returned")
                    .map((ri) => ri.equipment_id)
            );
        }
        return new Set(rental.equipment.map((e) => e.id));
    }, [rental]);

    // Кандидаты на добавление (за исключением уже активных в этой аренде)
    const candidateEquipment = useMemo(() => {
        return allEquipment.filter((eq) => !existingActiveEquipmentIds.has(eq.id));
    }, [allEquipment, existingActiveEquipmentIds]);

    // Фильтрация по строке поиска
    const filteredEquipment = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return candidateEquipment;
        return candidateEquipment.filter(
            (eq) =>
                eq.name.toLowerCase().includes(query) ||
                eq.brand.toLowerCase().includes(query) ||
                eq.equipment_type.toLowerCase().includes(query)
        );
    }, [candidateEquipment, search]);

    // Даты интервала аренды для проверки доступности
    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!rental) {
            return { startDate: today, endDate: today };
        }

        const rentalEnd = new Date(rental.end_date);
        rentalEnd.setHours(0, 0, 0, 0);

        const effStart = today > rentalEnd ? rentalEnd : today;
        return { startDate: effStart, endDate: rentalEnd };
    }, [rental]);

    // Кандидаты для проверки доступности
    const candidateIds = useMemo(() => {
        return candidateEquipment.map((e) => e.id);
    }, [candidateEquipment]);

    const { availabilityMap, isLoading: isCheckingAvailability } = useAvailabilityCheck({
        equipmentIds: candidateIds,
        startDate,
        endDate,
        enabled: open && !!rental && candidateIds.length > 0,
    });

    // Оставшееся количество дней аренды
    const remainingDays = useMemo(() => {
        if (!rental) return 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const rentalEnd = new Date(rental.end_date);
        rentalEnd.setHours(0, 0, 0, 0);

        const diffTime = rentalEnd.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    }, [rental]);

    // Коэффициент скидки аренды
    const discountRatio = useMemo(() => {
        if (!rental) return 0;
        const total = Number(rental.total_cost) || 0;
        const discount = Number(rental.discount_amount) || 0;
        if (total + discount > 0) {
            return discount / (total + discount);
        }
        return 0;
    }, [rental]);

    // Выбранное оборудование как объекты
    const selectedEquipmentList = useMemo(() => {
        return allEquipment.filter((eq) => selectedEquipmentIds.has(eq.id));
    }, [allEquipment, selectedEquipmentIds]);

    // Расчет ориентировочной дополнительной стоимости (с учетом аксессуаров)
    const estimatedAdditionalCost = useMemo(() => {
        let sum = 0;
        for (const eq of selectedEquipmentList) {
            const dailyRate = Number(eq.daily_rate) || 0;
            const effectiveRate = dailyRate * (1 - discountRatio);
            sum += effectiveRate * remainingDays;

            if (eq.accessories) {
                for (const acc of eq.accessories) {
                    if (selectedAccessoryIds.has(acc.id)) {
                        const accRate = Number(acc.price) || 0;
                        const effectiveAccRate = accRate * (1 - discountRatio);
                        sum += effectiveAccRate * remainingDays;
                    }
                }
            }
        }
        return Math.round(sum * 100) / 100;
    }, [selectedEquipmentList, selectedAccessoryIds, discountRatio, remainingDays]);

    const handleToggleEquipment = (eqId: number, isAvailable: boolean) => {
        if (!isAvailable) return;
        setSelectedEquipmentIds((prev) => {
            const next = new Set(prev);
            if (next.has(eqId)) {
                next.delete(eqId);
                // Также снимаем выделение со связанных аксессуаров
                const eq = allEquipment.find((item) => item.id === eqId);
                if (eq?.accessories) {
                    setSelectedAccessoryIds((accPrev) => {
                        const accNext = new Set(accPrev);
                        eq.accessories.forEach((acc) => accNext.delete(acc.id));
                        return accNext;
                    });
                }
            } else {
                next.add(eqId);
            }
            return next;
        });
    };

    const handleToggleAccessory = (accId: number) => {
        setSelectedAccessoryIds((prev) => {
            const next = new Set(prev);
            if (next.has(accId)) {
                next.delete(accId);
            } else {
                next.add(accId);
            }
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!rental || selectedEquipmentIds.size === 0) return;

        const selectedAccessoriesMap: Record<number, number[]> = {};
        for (const eqId of selectedEquipmentIds) {
            const eq = allEquipment.find((item) => item.id === eqId);
            if (eq?.accessories) {
                const accIds = eq.accessories
                    .map((a) => a.id)
                    .filter((id) => selectedAccessoryIds.has(id));
                if (accIds.length > 0) {
                    selectedAccessoriesMap[eqId] = accIds;
                }
            }
        }

        addEquipmentMutation.mutate(
            {
                rentalId: rental.id,
                data: {
                    equipment_ids: Array.from(selectedEquipmentIds),
                    selected_accessories:
                        Object.keys(selectedAccessoriesMap).length > 0
                            ? selectedAccessoriesMap
                            : undefined,
                },
            },
            {
                onSuccess: () => {
                    onClose();
                },
            }
        );
    };

    if (!rental) return null;

    const isSubmitting = addEquipmentMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PackagePlus className="w-5 h-5 text-primary" />
                        Добрать технику в аренду #{rental.id}
                    </DialogTitle>
                    <DialogDescription>
                        Клиент: <strong>{rental.user.full_name}</strong> | Период добора:{" "}
                        <strong>
                            {formatDateEuropean(startDate.toISOString())} — {formatDateEuropean(rental.end_date)} ({remainingDays} {remainingDays === 1 ? "день" : remainingDays < 5 ? "дня" : "дней"})
                        </strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Поиск техники */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Поиск по названию, бренду или типу..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Список доступной для добора техники */}
                    <div className="border rounded-lg overflow-hidden">
                        <div className="bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground flex justify-between items-center border-b">
                            <span>Доступное оборудование</span>
                            <span>Выбрано: {selectedEquipmentIds.size}</span>
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y">
                            {isLoadingEquipment || isCheckingAvailability ? (
                                <div className="flex items-center justify-center p-6 text-muted-foreground text-sm gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Проверка доступности оборудования...</span>
                                </div>
                            ) : filteredEquipment.length === 0 ? (
                                <div className="p-6 text-center text-muted-foreground text-sm">
                                    {search
                                        ? "Ничего не найдено по вашему запросу."
                                        : "Нет доступного для добавления оборудования."}
                                </div>
                            ) : (
                                filteredEquipment.map((eq: Equipment) => {
                                    const availability = availabilityMap[eq.id] as (AvailabilityInfo & { is_available?: boolean }) | undefined;
                                    const isAvailable = availability
                                        ? availability.status !== undefined
                                            ? availability.status === "available"
                                            : availability.is_available !== false
                                        : true;
                                    const isSelected = selectedEquipmentIds.has(eq.id);

                                    return (
                                        <div
                                            key={eq.id}
                                            className={`p-3 transition-colors ${
                                                !isAvailable
                                                    ? "bg-muted/40 opacity-60 cursor-not-allowed"
                                                    : isSelected
                                                    ? "bg-primary/5 border-l-4 border-l-primary"
                                                    : "hover:bg-muted/30"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        id={`add-eq-${eq.id}`}
                                                        checked={isSelected}
                                                        disabled={!isAvailable}
                                                        onCheckedChange={() =>
                                                            handleToggleEquipment(eq.id, isAvailable)
                                                        }
                                                    />
                                                    <div>
                                                        <Label
                                                            htmlFor={`add-eq-${eq.id}`}
                                                            className={`font-medium text-sm ${
                                                                !isAvailable ? "cursor-not-allowed" : "cursor-pointer"
                                                            }`}
                                                        >
                                                            {eq.name}
                                                        </Label>
                                                        <div className="text-xs text-muted-foreground">
                                                            {eq.brand} • {eq.equipment_type}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">
                                                        <MoneyText value={eq.daily_rate} />/сут
                                                    </span>
                                                    {!isAvailable ? (
                                                        <Badge variant="destructive" className="text-3xs">
                                                            Занято
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="pastelMint" className="text-3xs">
                                                            Доступно
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Аксессуары к оборудованию при выборе */}
                                            {isSelected && eq.accessories && eq.accessories.length > 0 && (
                                                <div className="mt-2.5 ml-7 pl-3 border-l-2 border-border space-y-1.5 bg-muted/20 p-2 rounded">
                                                    <span className="text-xs font-semibold text-muted-foreground block">
                                                        Аксессуары в комплекте:
                                                    </span>
                                                    {eq.accessories.map((acc: Accessory) => (
                                                        <div key={acc.id} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`acc-${acc.id}`}
                                                                checked={selectedAccessoryIds.has(acc.id)}
                                                                onCheckedChange={() => handleToggleAccessory(acc.id)}
                                                            />
                                                            <Label
                                                                htmlFor={`acc-${acc.id}`}
                                                                className="text-xs text-foreground cursor-pointer"
                                                            >
                                                                {acc.name}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Финансовая сводка добора */}
                    <div className="bg-muted p-3 rounded-lg space-y-2 text-sm border">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Текущий баланс клиента:</span>
                            <span className={`font-medium ${getBalanceColor(rental.user.balance)}`}>
                                {formatBalance(rental.user.balance)}
                            </span>
                        </div>

                        {discountRatio > 0 && (
                            <div className="flex justify-between items-center text-xs text-success">
                                <span>Скидка аренды ({Math.round(discountRatio * 100)}%):</span>
                                <span>Применяется к добору</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center font-medium pt-1 border-t">
                            <span>Ориентировочная доплата:</span>
                            <span className="text-primary font-semibold text-base">
                                <MoneyText value={estimatedAdditionalCost} />
                            </span>
                        </div>

                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1">
                            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-info" />
                            <span>
                                Стоимость будет списана с баланса клиента. При нехватке средств баланс станет отрицательным (образуется задолженность).
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Отмена
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={selectedEquipmentIds.size === 0 || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Добавление...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Добавить в аренду ({selectedEquipmentIds.size})
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
