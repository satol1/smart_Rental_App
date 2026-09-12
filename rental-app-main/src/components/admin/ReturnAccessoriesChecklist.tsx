// src/components/admin/ReturnAccessoriesChecklist.tsx

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/ui/money-text";
import { AlertTriangle, CheckCheck, PackageX } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";
import type { Accessory } from "@/types/accessory";
import type { Equipment } from "@/types/equipment";

interface Props {
    rental: AdminRentalOut;
    accessoriesByEquipment: Record<number, Accessory[]>;
    checkedAccessories: Set<string>;
    lostAccessories: Map<string, { accessoryId: number; equipmentId: number; name: string; price: number }>;
    handleToggleAccessory: (equipmentId: number, accessoryId: number) => void;
    handleToggleLostAccessory: (equipmentId: number, accessory: Accessory) => void;
    handleSelectAllAccessories: () => void;
    handleDeselectAllAccessories: () => void;
    totalAccessoriesCount: number;
    lostAccessoriesTotal?: number;
}

export default function ReturnAccessoriesChecklist({
    rental,
    accessoriesByEquipment,
    checkedAccessories,
    lostAccessories,
    handleToggleAccessory,
    handleToggleLostAccessory,
    handleSelectAllAccessories,
    handleDeselectAllAccessories,
    totalAccessoriesCount,
    lostAccessoriesTotal = 0,
}: Props) {
    if (totalAccessoriesCount === 0) {
        return null;
    }

    const accountedCount = checkedAccessories.size + lostAccessories.size;
    const isAllAccounted = accountedCount >= totalAccessoriesCount;

    return (
        <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Label className="font-semibold text-sm">Подтвердите возврат аксессуаров:</Label>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isAllAccounted ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                    }`}>
                        {checkedAccessories.size} сдано {lostAccessories.size > 0 ? `| ${lostAccessories.size} утеряно ` : ""}/ {totalAccessoriesCount}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <button
                        type="button"
                        onClick={handleSelectAllAccessories}
                        className="text-primary hover:underline flex items-center gap-1"
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Выбрать все
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                        type="button"
                        onClick={handleDeselectAllAccessories}
                        className="text-muted-foreground hover:underline"
                    >
                        Снять все
                    </button>
                </div>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto rounded-md border p-3 bg-muted/60">
                {rental.equipment.map((eq: Equipment) => (
                    accessoriesByEquipment[eq.id] && accessoriesByEquipment[eq.id].length > 0 && (
                        <div key={eq.id} className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {eq.name}
                            </p>
                            <ul className="space-y-1 pl-1">
                                {accessoriesByEquipment[eq.id].map((acc: Accessory) => {
                                    const key = `${eq.id}-${acc.id}`;
                                    const isChecked = checkedAccessories.has(key);
                                    const isLost = lostAccessories.has(key);

                                    return (
                                        <li
                                            key={key}
                                            className={`flex items-center justify-between p-1.5 rounded-md text-sm transition-colors ${
                                                isLost
                                                    ? "bg-destructive/10 border border-destructive/30"
                                                    : isChecked
                                                        ? "bg-background border border-primary/20"
                                                        : "bg-background/50 border border-transparent"
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={key}
                                                    checked={isChecked}
                                                    disabled={isLost}
                                                    onCheckedChange={() => handleToggleAccessory(eq.id, acc.id)}
                                                />
                                                <Label
                                                    htmlFor={key}
                                                    className={`text-sm cursor-pointer ${
                                                        isLost ? "line-through text-destructive opacity-80" : "font-normal"
                                                    }`}
                                                >
                                                    {acc.name}
                                                </Label>
                                                {acc.price > 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        (<MoneyText value={acc.price} />)
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                {isLost ? (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-6 px-2 text-2xs flex items-center gap-1"
                                                        onClick={() => handleToggleLostAccessory(eq.id, acc)}
                                                    >
                                                        <PackageX className="w-3 h-3" />
                                                        Утерян (+<MoneyText value={acc.price || 0} />)
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 px-2 text-2xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleToggleLostAccessory(eq.id, acc)}
                                                    >
                                                        Пометить как утерян
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )
                ))}
            </div>

            {/* Блок информации об утерянных аксессуарах */}
            {lostAccessoriesTotal > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                        <div className="font-semibold">
                            Утеряно аксессуаров: {lostAccessories.size} шт.
                        </div>
                        <div className="text-muted-foreground">
                            Сумма компенсации: <strong className="text-destructive"><MoneyText value={lostAccessoriesTotal} /></strong> начислена к оплате.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
