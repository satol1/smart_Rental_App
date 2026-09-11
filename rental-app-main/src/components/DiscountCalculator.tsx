// path: rental-app-main/src/components/DiscountCalculator.tsx

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { transitionFast } from '@/lib/motion';
import { useSandboxCalculatorStore } from '@/store/sandboxCalculatorStore';
import { combinedDiscountPercentage } from '@/constants/discount';
import { useDateStore } from '@/store/dateStore';
import { usePromoCodeStore, RESERVE_PROMO_SCOPE, EMPTY_PROMO_SCOPE_STATE } from '@/store/promoCodeStore';
import { useReserveStore } from '@/store/reserveStore';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { ChevronRight, Percent, Loader2 } from "lucide-react";
import PromoCodeInput from './PromoCodeInput';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function DiscountCalculator() {
    const { t } = useTranslation();
    const { dayCount } = useDateStore();
    const {
        setDaysFromSlider, isCalculatorVisible, toggleCalculator,
        isLoadingTiers, durationDiscountPercentage, durationDiscountTiers,
        syncWithDateStore
    } = useSandboxCalculatorStore();

    // Промокод — только скоуп страницы оформления (калькулятор скидок каталога)
    const {
        promoCodeInput,
        promoCodePercentage,
        promoCodeMessage,
        promoCodeValid,
    } = usePromoCodeStore((s) => s.scopes[RESERVE_PROMO_SCOPE] ?? EMPTY_PROMO_SCOPE_STATE);
    const setPromoCodeInputAction = usePromoCodeStore((s) => s.setPromoCodeInput);
    const applyPromoCodeAction = usePromoCodeStore((s) => s.applyPromoCode);
    const removePromoCodeAction = usePromoCodeStore((s) => s.removePromoCode);
    const setPromoCodeResult = usePromoCodeStore((s) => s.setPromoCodeResult);

    // Привязка действий к скоупу резерва
    const setPromoCodeInput = useCallback(
        (code: string) => setPromoCodeInputAction(RESERVE_PROMO_SCOPE, code),
        [setPromoCodeInputAction]
    );
    const removePromoCode = useCallback(
        () => removePromoCodeAction(RESERVE_PROMO_SCOPE),
        [removePromoCodeAction]
    );

    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        syncWithDateStore();
    }, [dayCount, syncWithDateStore]);

    const [isApplyingPromoCode, setIsApplyingPromoCode] = useState(false);

    const handleApplyPromoCode = async () => {
        const currentItems = useReserveStore.getState().items;
        const currentDays = useDateStore.getState().dayCount;
        
        if (!promoCodeInput) {
            toast.info("Введите промокод");
            return;
        }

        const totalDailyRate = currentItems.reduce((sum, item) => sum + item.daily_rate, 0);
        // Аксессуары входят в сумму заказа: бэкенд проверяет min_order_amount
        // по полной стоимости (оборудование + аксессуары), без них промо с порогом
        // ложно отклонялся на фронте
        const selectedAccessoriesMap = useReserveStore.getState().selectedAccessories;
        const accessoriesDailyRate = currentItems.reduce((sum, item) => {
            const selectedIds = selectedAccessoriesMap[item.id] || [];
            const itemAccessoriesRate = (item.accessories || [])
                .filter(acc => selectedIds.includes(acc.id))
                .reduce((s, acc) => s + acc.price, 0);
            return sum + itemAccessoriesRate;
        }, 0);
        // Если сумма заказа 0 (нет товаров), бэкенд вернет ошибку о мин. сумме, если она есть у промокода.
        const orderAmount = (totalDailyRate + accessoriesDailyRate) * currentDays;

        setIsApplyingPromoCode(true);
        try {
            const response = await api.post("/promocodes/validate", {
                code: promoCodeInput,
                order_amount: orderAmount,
                equipment_ids: currentItems.map(item => item.id)
            });
            setPromoCodeResult(RESERVE_PROMO_SCOPE, response.data.discount_percentage, response.data.message, true);
            // Фиксируем введенный код как примененный для всех расчетов
            applyPromoCodeAction(RESERVE_PROMO_SCOPE);
            toast.success(response.data.message);
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { detail?: string } } }
            const errorMessage = apiError.response?.data?.detail || "Не удалось применить промокод";
            setPromoCodeResult(RESERVE_PROMO_SCOPE, 0, errorMessage, false);
            toast.error(errorMessage);
        } finally {
            setIsApplyingPromoCode(false);
        }
    };

    const handleSliderChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const newDays = Number(event.target.value);
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            setDaysFromSlider(newDays);
        }, 10);
    }, [setDaysFromSlider]);

    const totalDiscountPercentage = useMemo(() => combinedDiscountPercentage(durationDiscountPercentage, promoCodePercentage), [durationDiscountPercentage, promoCodePercentage]);

    const reducedMotion = useReducedMotion();
    // Пружина ведёт число плавно, без дёрганья; при reduced-motion прыгаем сразу к цели
    const percentSpring = useSpring(totalDiscountPercentage, { stiffness: 180, damping: 26 });
    useEffect(() => {
        if (reducedMotion) {
            percentSpring.jump(totalDiscountPercentage);
        } else {
            percentSpring.set(totalDiscountPercentage);
        }
    }, [totalDiscountPercentage, reducedMotion, percentSpring]);
    const displayPercent = useTransform(percentSpring, (v) => Math.round(v));

    // Вычисляем максимальное значение для бегунка на основе максимального min_days + 3 (рабочие дни)
    const maxSliderDays = useMemo(() => {
        if (durationDiscountTiers.length === 0) return 30; // fallback значение
        const maxMinDays = Math.max(...durationDiscountTiers.map(tier => tier.min_days));
        return maxMinDays + 3; // Это рабочие дни
    }, [durationDiscountTiers]);

    // Градация только на фирменных токенах: muted → accent → success-soft → warning-soft
    const getDiscountInfo = (percent: number) => {
        if (percent >= 25) return {label: "Максимум выгоды!", blockClass: "bg-warning-soft border-warning/30", textClass: "text-warning font-bold"};
        if (percent >= 20) return {label: "Отличная скидка!", blockClass: "bg-success-soft border-success/30", textClass: "text-success font-bold"};
        if (percent >= 15) return {label: "Хорошая скидка", blockClass: "bg-accent border-primary/25", textClass: "text-accent-foreground font-bold"};
        if (percent > 0) return {label: "Небольшая скидка", blockClass: "bg-accent border-border", textClass: "text-accent-foreground"};
        return {label: "Скидка зависит от дней", blockClass: "bg-muted border-border", textClass: "text-muted-foreground"};
    };

    const discountInfo = getDiscountInfo(totalDiscountPercentage);

    if (!isCalculatorVisible) {
        return (
            <button type="button" className="mb-1 flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-primary focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={toggleCalculator} aria-expanded={false}>
                <Percent className="size-4" aria-hidden="true" />
                <span>{t('catalogDesign.promo')}</span>
                <ChevronRight className="size-4" aria-hidden="true" />
            </button>
        );
    }

    return (
        <Card className="my-4 bg-card border-border shadow-none">
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
                    <div className="w-full md:flex-1">
                        <PromoCodeInput
                            promoCode={promoCodeInput}
                            setPromoCode={setPromoCodeInput}
                            applyPromoCode={handleApplyPromoCode}
                            removePromoCode={removePromoCode}
                            promoCodeMessage={promoCodeMessage}
                            promoCodeValid={promoCodeValid}
                            isLoading={isApplyingPromoCode}
                        />
                    </div>
                    <div className="w-full md:flex-1">
                        <Label htmlFor="days-slider" className="mb-2 block text-sm text-foreground">
                            Количество дней: <span className="font-bold tabular-nums">{dayCount}</span>
                            <span className="ml-2 text-xs text-muted-foreground">(двигайте ползунок для изменения дат)</span>
                            <span className="ml-2 text-xs text-primary">Max: {maxSliderDays}</span>
                        </Label>
                        <input id="days-slider" type="range" min="1" max={maxSliderDays} value={dayCount} onChange={handleSliderChange}
                               className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted transition-colors
                                   [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                                   [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm
                                   [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150
                                   hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95
                                   focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring
                                   [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
                                   [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary
                                   [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:duration-150"/>
                    </div>
                    <div className={`flex-shrink-0 text-center py-2 px-4 rounded-lg border w-full md:w-auto min-w-[160px] transition-colors duration-300 ${discountInfo.blockClass}`}>
                        {isLoadingTiers ? (
                            <div className="flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка...</div>
                        ) : (
                            <>
                                <div className={`text-3xl font-bold tabular-nums transition-colors duration-300 ${discountInfo.textClass}`}>
                                    Скидка: <motion.span className="inline-block">{displayPercent}</motion.span>%
                                </div>
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.p
                                        key={discountInfo.label}
                                        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={reducedMotion ? { duration: 0 } : transitionFast}
                                        className={`text-xs mt-1 transition-colors duration-300 ${discountInfo.textClass}`}
                                    >
                                        {discountInfo.label}
                                    </motion.p>
                                </AnimatePresence>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}