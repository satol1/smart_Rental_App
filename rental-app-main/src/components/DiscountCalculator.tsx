// path: rental-app-main/src/components/DiscountCalculator.tsx

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useSandboxCalculatorStore } from '@/store/sandboxCalculatorStore';
import { useDateStore } from '@/store/dateStore';
import { usePromoCodeStore } from '@/store/promoCodeStore';
import { useReserveStore } from '@/store/reserveStore';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { ChevronRight, Percent, Loader2 } from "lucide-react";
import PromoCodeInput from './PromoCodeInput';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function DiscountCalculator() {
    const { dayCount } = useDateStore();
    const {
        setDaysFromSlider, isCalculatorVisible, toggleCalculator,
        isLoadingTiers, durationDiscountPercentage, durationDiscountTiers,
        syncWithDateStore
    } = useSandboxCalculatorStore();

    const {
        promoCodeInput,
        appliedPromoCode,
        setPromoCodeInput,
        applyPromoCode,
        removePromoCode,
        promoCodePercentage,
        promoCodeMessage,
        setPromoCodeResult,
    } = usePromoCodeStore();

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
        // Если сумма заказа 0 (нет товаров), бэкенд вернет ошибку о мин. сумме, если она есть у промокода.
        const orderAmount = totalDailyRate * currentDays;

        setIsApplyingPromoCode(true);
        try {
            const response = await api.post("/promocodes/validate", {
                code: promoCodeInput,
                order_amount: orderAmount,
                equipment_ids: currentItems.map(item => item.id)
            });
            setPromoCodeResult(response.data.discount_percentage, response.data.message);
            // Фиксируем введенный код как примененный для всех расчетов
            applyPromoCode();
            toast.success(response.data.message);
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { detail?: string } } }
            const errorMessage = apiError.response?.data?.detail || "Не удалось применить промокод";
            setPromoCodeResult(0, errorMessage);
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

    const totalDiscountPercentage = useMemo(() => durationDiscountPercentage + promoCodePercentage, [durationDiscountPercentage, promoCodePercentage]);

    // Вычисляем максимальное значение для бегунка на основе максимального min_days + 3 (рабочие дни)
    const maxSliderDays = useMemo(() => {
        if (durationDiscountTiers.length === 0) return 30; // fallback значение
        const maxMinDays = Math.max(...durationDiscountTiers.map(tier => tier.min_days));
        return maxMinDays + 3; // Это рабочие дни
    }, [durationDiscountTiers]);

    const getDiscountInfo = (percent: number) => {
        if (percent >= 25) return {label: "Максимум выгоды!", className: "text-amber-600 font-bold"};
        if (percent >= 20) return {label: "Отличная скидка!", className: "text-purple-600 font-bold"};
        if (percent >= 15) return {label: "Хорошая скидка", className: "text-green-600 font-bold"};
        if (percent > 0) return {label: "Небольшая скидка", className: "text-sky-600"};
        return {label: "Скидка зависит от дней", className: "text-gray-500"};
    };

    const discountInfo = getDiscountInfo(totalDiscountPercentage);

    if (!isCalculatorVisible) {
        return (
            <Card
                className="my-4 bg-gray-50/50 hover:bg-gray-100 cursor-pointer transition"
                onClick={toggleCalculator}
            >
                <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Percent className="w-5 h-5 text-purple-500"/>
                            <div className="text-sm">
                                <p className="text-gray-800">
                                    <span className="text-base font-bold text-purple-600">Есть промокод?</span>
                                    <span className="font-medium"> или хотите рассчитать скидку?</span>
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400"/>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="my-4 bg-white border-sky-200 shadow-md">
            <CardContent className="p-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
                    <div className="w-full md:flex-1">
                        <PromoCodeInput
                            promoCode={promoCodeInput}
                            setPromoCode={setPromoCodeInput}
                            applyPromoCode={handleApplyPromoCode}
                            removePromoCode={removePromoCode}
                            promoCodeMessage={promoCodeMessage}
                            isLoading={isApplyingPromoCode}
                        />
                    </div>
                    <div className="w-full md:flex-1">
                        <Label htmlFor="days-slider" className="mb-2 block text-sm text-gray-700">
                            Количество дней: <span className="font-bold">{dayCount}</span>
                            <span className="ml-2 text-xs text-gray-500">(двигайте ползунок для изменения дат)</span>
                            <span className="ml-2 text-xs text-blue-500">Max: {maxSliderDays}</span>
                        </Label>
                        <input id="days-slider" type="range" min="1" max={maxSliderDays} value={dayCount} onChange={handleSliderChange}
                               className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-sky-600"/>
                    </div>
                    <div className="flex-shrink-0 text-center bg-sky-50 py-2 px-4 rounded-lg border w-full md:w-auto min-w-[160px]">
                        {isLoadingTiers ? (
                            <div className="flex items-center justify-center text-gray-500"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Загрузка...</div>
                        ) : (
                            <>
                                <div className={`text-2xl font-bold transition-colors duration-300 ${discountInfo.className}`}>Скидка: {totalDiscountPercentage}%</div>
                                <p className={`text-xs mt-1 transition-colors duration-300 ${discountInfo.className}`}>{discountInfo.label}</p>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}