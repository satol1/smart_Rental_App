// path: rental-app-main/src/components/PromoCodeInput.tsx

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TicketPercent, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, useReducedMotion } from "framer-motion";
import { buttonGesture, springs } from "@/lib/motion";

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
    const id = useId();
    const { t } = useTranslation();

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
    const reducedMotion = useReducedMotion();
    const isApplyDisabled = disabled || isLoading || isSuccess || isDisabledByRequirement;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <Label htmlFor={id} className="text-sm font-medium text-foreground">{t('ordersDesign.promoCode')}</Label>
                {promoCode && removePromoCode && (
                    <Button type="button" variant="ghost" size="sm" onClick={removePromoCode} className="text-xs text-muted-foreground hover:text-destructive">{t('ordersDesign.resetPromo')}</Button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-grow">
                    <TicketPercent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                        id={id}
                        aria-describedby={isApplied || isDisabledByRequirement ? id + '-message' : undefined}
                        type="text"
                        placeholder="SALE15"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isApplyDisabled}
                        className="pl-9 pr-8"
                    />
                    {isSuccess && promoCode && (
                        <motion.span
                            className="absolute right-3 top-1/2"
                            initial={reducedMotion ? { y: '-50%' } : { scale: 0.5, opacity: 0, y: '-50%' }}
                            animate={{ scale: 1, opacity: 1, y: '-50%' }}
                            transition={reducedMotion ? { duration: 0 } : springs.pop}
                        >
                            <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
                        </motion.span>
                    )}
                </div>
                <motion.span
                    className="inline-flex"
                    {...(!isApplyDisabled && !reducedMotion ? buttonGesture : {})}
                >
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleApply}
                    aria-label={t('ordersDesign.applyPromo')}
                    disabled={isApplyDisabled}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t('ordersDesign.applyPromo')}
                </Button>
                </motion.span>
            </div>

            {isDisabledByRequirement && (
                <div id={id + '-message'} className="flex items-center gap-1.5 text-xs mt-1.5 text-warning">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{requirementMessage}</span>
                </div>
            )}

            {!isDisabledByRequirement && isApplied && promoCode && (
                <div id={id + '-message'} role="status" className={`flex items-center gap-2 text-xs mt-1.5 ${isSuccess ? "text-success" : "text-destructive"}`}>
                    {!isSuccess && <XCircle className="h-3.5 w-3.5" />}
                    <span>{promoCodeMessage}</span>
                </div>
            )}
        </div>
    );
}
