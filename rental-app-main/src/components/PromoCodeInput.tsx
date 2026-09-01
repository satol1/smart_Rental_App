// path: rental-app-main/src/components/PromoCodeInput.tsx

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TicketPercent, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PromoCodeInputProps {
    promoCode: string;
    setPromoCode: (code: string) => void;
    applyPromoCode: () => void;
    removePromoCode?: () => void;
    promoCodeMessage: string;
    disabled?: boolean;
    isLoading?: boolean;
    requirementMessage?: string;
}

export default function PromoCodeInput({
   promoCode,
   setPromoCode,
   applyPromoCode,
   removePromoCode,
   promoCodeMessage,
   disabled = false,
   isLoading = false,
   requirementMessage,
}: PromoCodeInputProps) {

    const handleApply = () => {
        if (!promoCode || !promoCode.trim()) {
            toast.info("Пожалуйста, введите промокод.");
            return;
        }
        applyPromoCode();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleApply();
        }
    };

    const isApplied = promoCodeMessage && promoCodeMessage.length > 0;
    const isSuccess = isApplied && promoCodeMessage.includes("успешно");
    const isDisabledByRequirement = !!requirementMessage;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <Label htmlFor="promo-code" className="text-base md:text-lg font-semibold text-purple-600">Промокод</Label>
                {promoCode && removePromoCode && (
                    <button onClick={removePromoCode} className="text-[11px] text-gray-500 hover:text-red-600 hover:underline">Сбросить</button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <TicketPercent className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        id="promo-code"
                        type="text"
                        placeholder="SALE15"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled || isLoading || isSuccess || isDisabledByRequirement}
                        className="pl-8"
                    />
                    {isSuccess && promoCode && (
                        <CheckCircle className="absolute right-2.5 top-2.5 h-4 w-4 text-green-500" />
                    )}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleApply}
                    disabled={disabled || isLoading || isSuccess || isDisabledByRequirement}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
                </Button>
            </div>

            {isDisabledByRequirement && (
                <div className="flex items-center gap-1.5 text-xs mt-1.5 text-orange-600">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{requirementMessage}</span>
                </div>
            )}

            {!isDisabledByRequirement && isApplied && promoCode && (
                <div className={`flex items-center gap-2 text-xs mt-1.5 ${isSuccess ? "text-green-600" : "text-red-600"}`}>
                    {!isSuccess && <XCircle className="h-3.5 w-3.5" />}
                    <span>{promoCodeMessage}</span>
                </div>
            )}
        </div>
    );
}