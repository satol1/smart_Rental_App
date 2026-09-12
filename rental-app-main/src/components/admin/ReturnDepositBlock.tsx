// src/components/admin/ReturnDepositBlock.tsx

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MoneyText } from "@/components/ui/money-text";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { AdminRentalOut } from "@/types/rental";

interface Props {
    rental: AdminRentalOut;
    depositAction: 'refund' | 'retain' | 'partial_retain';
    setDepositAction: (action: 'refund' | 'retain' | 'partial_retain') => void;
    depositRetainedAmount: string;
    setDepositRetainedAmount: (val: string) => void;
    depositNotes: string;
    setDepositNotes: (val: string) => void;
    lostAccessoriesTotal?: number;
    handleAutoDeductLostFromDeposit?: () => void;
}

export default function ReturnDepositBlock({
    rental,
    depositAction,
    setDepositAction,
    depositRetainedAmount,
    setDepositRetainedAmount,
    depositNotes,
    setDepositNotes,
    lostAccessoriesTotal,
    handleAutoDeductLostFromDeposit,
}: Props) {
    const depositAmount = rental.deposit_amount || 0;
    if (depositAmount <= 0) return null;

    const parsedRetained = parseFloat(depositRetainedAmount) || 0;
    const refundedRemainder = Math.max(0, depositAmount - parsedRetained);
    const isRetainedOverLimit = parsedRetained > depositAmount;

    return (
        <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
                <div>
                    <Label className="font-semibold text-base flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Возврат / удержание залога
                    </Label>
                    <p className="text-2xs text-muted-foreground">
                        Наличные в сейфе под расписку (вне финансового баланса клиента и выручки)
                    </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                    Залог в сейфе: <MoneyText value={depositAmount} />
                </span>
            </div>

            <div className="p-3 bg-muted/60 rounded-md border space-y-3">
                {/* Варианты действия с залогом */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => setDepositAction('refund')}
                        className={`p-2.5 text-left rounded-md border text-xs font-medium transition-colors ${
                            depositAction === 'refund'
                                ? "bg-background border-success text-success ring-1 ring-success"
                                : "bg-card border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        <div className="font-semibold text-foreground">Вернуть залог</div>
                        <div className="text-2xs opacity-80">Клиенту: <MoneyText value={depositAmount} /></div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDepositAction('partial_retain')}
                        className={`p-2.5 text-left rounded-md border text-xs font-medium transition-colors ${
                            depositAction === 'partial_retain'
                                ? "bg-background border-warning text-warning ring-1 ring-warning"
                                : "bg-card border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        <div className="font-semibold text-foreground">Частичный возврат</div>
                        <div className="text-2xs opacity-80">Удержание за дефекты</div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setDepositAction('retain')}
                        className={`p-2.5 text-left rounded-md border text-xs font-medium transition-colors ${
                            depositAction === 'retain'
                                ? "bg-background border-destructive text-destructive ring-1 ring-destructive"
                                : "bg-card border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        <div className="font-semibold text-foreground">Удержать весь залог</div>
                        <div className="text-2xs opacity-80">За ущерб / некомплект</div>
                    </button>
                </div>

                {/* Автоперенос стоимости утерянных аксессуаров в удержание залога */}
                {lostAccessoriesTotal != null && lostAccessoriesTotal > 0 && handleAutoDeductLostFromDeposit && (
                    <button
                        type="button"
                        onClick={handleAutoDeductLostFromDeposit}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-primary/30 bg-info-soft px-3 py-2 text-left text-2xs text-pastel-sky-fg transition-colors hover:bg-primary/15"
                    >
                        <span>
                            За утерю аксессуаров: <strong className="font-semibold">{lostAccessoriesTotal} ₽</strong> — перенести в удержание залога
                        </span>
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    </button>
                )}

                {/* Поле частичного удержания */}
                {depositAction === 'partial_retain' && (
                    <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="deposit_retained_amount" className="text-xs">
                                Сумма удержания (₽) *
                            </Label>
                            <span className="text-xs text-muted-foreground">
                                Возврат клиенту: <strong className="text-foreground"><MoneyText value={refundedRemainder} /></strong>
                            </span>
                        </div>
                        <Input
                            id="deposit_retained_amount"
                            type="number"
                            min="0"
                            max={depositAmount}
                            step="0.01"
                            value={depositRetainedAmount}
                            onChange={(e) => setDepositRetainedAmount(e.target.value)}
                            placeholder="Например: 1500"
                            className={isRetainedOverLimit ? "border-destructive" : ""}
                        />
                        {isRetainedOverLimit && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" /> Сумма удержания не может превышать залог ({depositAmount} ₽)
                            </p>
                        )}
                    </div>
                )}

                {/* Поле комментария к залогу */}
                <div>
                    <Label htmlFor="deposit_notes" className="text-xs text-muted-foreground">
                        {depositAction === 'refund' ? "Примечание к возврату залога (опционально)" : "Причина удержания залога *"}
                    </Label>
                    <Input
                        id="deposit_notes"
                        type="text"
                        value={depositNotes}
                        onChange={(e) => setDepositNotes(e.target.value)}
                        placeholder={depositAction === 'refund' ? "Например: возвращен наличными" : "Например: скол на бленде, утеряна крышка"}
                        className="mt-1 text-xs"
                    />
                </div>
            </div>
        </div>
    );
}
