// src/pages/ReservePage.tsx
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import AuthForm from "@/components/AuthForm";
import CancelReservationDialog from "@/components/CancelReservationDialog";
import { Button } from "@/components/ui/button";
import { useReserveSubmission } from "@/hooks/reservation/submission/useReserveSubmission";
import { formatDate } from "@/lib/utils";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import ReservationItemsList from "@/components/reservation/ReservationItemsList";
import FinancialSummaryBlock from "@/components/shared/FinancialSummaryBlock";
import { useHolidayValidation } from "@/hooks/useHolidayValidation";
import { mapLegacyUserStatus, EDIT_RESTRICTION_DAYS } from "@/constants/userStatusConstants";
import { daysUntilDate } from "@/utils/dates";

export default function ReservePage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const {
        items,
        user,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
        availabilityMap,
        unavailableIdsFromAPI,
        invalidItems,
        reservationSuccess,
        clearReserveStore,
        removeItemFromStore,
        isAccessorySelected,
        toggleAccessory,
        isLoadingAvailability,
        isSubmitting,
        isApplyingPromoCode,
        priceDetails,
        accessoriesDailyTotal,
        promoCode,
        promoCodeMessage,
        promoCodeValid,
        applyPromoCode,
        setPromoCode,
        removePromoCode,
        handleSubmit,
        selectedAccessories,
    } = useReserveSubmission();

    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showAuthForm, setShowAuthForm] = useState(true); // Показываем форму авторизации по умолчанию

    // Prefetch страницы «Мои заказы»: после успешного оформления происходит
    // редирект на неё, а lazy-чанк грузится первым разом именно в этот момент —
    // из-за этого переход казался «медленным». Прогреваем чанк заранее.
    useEffect(() => {
        void import("@/pages/MyReservationsPage");
    }, []);

    // Валидация выходных вынесена в переиспользуемый хук
    const { startDateError, endDateError, isHolidayValid } = useHolidayValidation(startDate, endDate);

    const handleConfirmCancel = () => {
        clearReserveStore();
        navigate("/");
    };

    // Обработчик успешной авторизации
    const handleAuthSuccess = () => {
        setShowAuthForm(false);
    };

    // Показываем форму авторизации, если пользователь не авторизован и форма должна быть показана
    const shouldShowAuthForm = !user && showAuthForm;

    // Автоматически управляем отображением формы авторизации
    useEffect(() => {
        if (user) {
            // Если пользователь авторизован, скрываем форму
            setShowAuthForm(false);
        } else {
            // Если пользователь не авторизован, показываем форму
            setShowAuthForm(true);
        }
    }, [user]);

    const isFormValid = useMemo(() => {
        return !!(user && invalidItems.length === 0 && unavailableIdsFromAPI.length === 0 && isHolidayValid);
    }, [user, invalidItems.length, unavailableIdsFromAPI.length, isHolidayValid]);

    // Понятная причина, почему кнопка подтверждения недоступна (Booking-паттерн:
    // не молча гасить кнопку, а объяснять, что нужно сделать)
    const formInvalidReason = useMemo(() => {
        if (!user) return null; // неавторизованным показываем форму входа выше
        if (invalidItems.length > 0) return "Устраните конфликты выбранных позиций.";
        if (unavailableIdsFromAPI.length > 0) return "Часть оборудования недоступна в выбранные даты — измените даты или состав.";
        if (!isHolidayValid) return "Даты резерва выпадают на выходной день — выберите рабочие даты.";
        return null;
    }, [user, invalidItems.length, unavailableIdsFromAPI.length, isHolidayValid]);

    // Правила отмены показываются ДО подтверждения (Booking/Airbnb-паттерн):
    // пользователь знает условия заранее, а не после оформления
    const cancellationPolicyNote = useMemo(() => {
        const userStatus = mapLegacyUserStatus(user?.status);
        if (!userStatus) return undefined;
        const needDays = EDIT_RESTRICTION_DAYS[userStatus] + 1;
        const startIn = daysUntilDate(startDate);
        const base = `Отмена/изменение самостоятельно — не позднее чем за ${needDays} дн. до начала (ваш статус: «${userStatus}»), позже — через менеджера. В течение 24 ч после создания резерв можно отменить бесплатно.`;
        if (startIn >= 0 && startIn < needDays) {
            return `${base} Внимание: до начала выбранного периода ${Math.max(startIn, 0)} дн. — самостоятельная отмена будет доступна только в первые 24 ч после оформления.`;
        }
        return base;
    }, [user?.status, startDate]);

    // Расчет минимальной даты для поля "Конец" (разрешена аренда на 1 день)
    const minEndDate = useMemo(() => {
        return formatDate(startDate);
    }, [startDate]);

    const returnToCatalog = () => navigate("/", {
        state: {
            intent: "add_to_new_reservation",
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        },
    });

    if (items.length === 0 && !reservationSuccess) {
        return (
            <section className="mx-auto flex max-w-xl flex-col items-center px-5 py-20 text-center">
                <ShoppingCart className="mb-5 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <h1 className="text-2xl font-semibold tracking-tight">{t('ordersDesign.empty')}</h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{t('ordersDesign.emptyNote')}</p>
                <Button className="mt-6" onClick={returnToCatalog}>{t('ordersDesign.chooseEquipment')}</Button>
            </section>
        );
    }

    return (
        <>
            <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
                <Button variant="ghost" size="sm" onClick={returnToCatalog} className="-ml-3 mb-5 text-muted-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />{t('ordersDesign.backToCatalog')}
                </Button>
                <header className="mb-8">
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('ordersDesign.checkout')}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('ordersDesign.checkoutNote')}</p>
                </header>
                <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
                    <div className="min-w-0 space-y-7">
                        {shouldShowAuthForm ? (
                            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                                <h2 className="text-lg font-semibold">{t('ordersDesign.authTitle')}</h2>
                                <p className="mb-5 mt-2 text-sm leading-relaxed text-muted-foreground">{t('ordersDesign.authNote')}</p>
                                <AuthForm onSuccess={handleAuthSuccess} embedded />
                            </section>
                        ) : !user ? (
                            <section className="rounded-2xl border border-border bg-card p-5">
                                <p className="mb-4 text-sm text-muted-foreground">{t('ordersDesign.authNote')}</p>
                                <Button onClick={() => setShowAuthForm(true)}>{t('ordersDesign.signIn')}</Button>
                            </section>
                        ) : null}

                        <section aria-labelledby="reserve-dates-heading">
                            <h2 id="reserve-dates-heading" className="mb-4 text-lg font-semibold">{t('ordersDesign.dates')}</h2>
                            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
                                <div className="min-w-0 space-y-2">
                                    <Label htmlFor="start-date">{t('ordersDesign.start')}</Label>
                                    <Input id="start-date" type="date" value={formatDate(startDate)}
                                        onChange={(e) => { const date = new Date(e.target.value); if (!isNaN(date.getTime())) setStartDate(date); }}
                                        min={formatDate(new Date())} aria-invalid={!!startDateError}
                                        aria-describedby={startDateError ? 'reserve-start-error' : undefined} />
                                    {startDateError && <p id="reserve-start-error" className="text-xs text-destructive">{startDateError}</p>}
                                </div>
                                <div className="min-w-0 space-y-2">
                                    <Label htmlFor="end-date">{t('ordersDesign.end')}</Label>
                                    <Input id="end-date" type="date" value={formatDate(endDate)}
                                        onChange={(e) => { const date = new Date(e.target.value); if (!isNaN(date.getTime())) setEndDate(date); }}
                                        min={minEndDate} aria-invalid={!!endDateError}
                                        aria-describedby={endDateError ? 'reserve-end-error' : undefined} />
                                    {endDateError && <p id="reserve-end-error" className="text-xs text-destructive">{endDateError}</p>}
                                </div>
                            </div>
                        </section>

                        <section aria-labelledby="reserve-items-heading">
                            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                                <h2 id="reserve-items-heading" className="text-lg font-semibold">{t('ordersDesign.equipment')}</h2>
                                <span className="text-sm tabular-nums text-muted-foreground">{t('ordersDesign.itemCount', { count: items.length })}</span>
                            </div>
                            {isLoadingAvailability && <p role="status" className="mb-3 text-sm text-muted-foreground">{t('ordersDesign.checking')}</p>}
                            <ReservationItemsList
                                items={items} selectedAccessories={selectedAccessories} availabilityMap={availabilityMap}
                                unavailableIdsFromAPI={unavailableIdsFromAPI} invalidItems={invalidItems}
                                onRemoveItem={removeItemFromStore} onRemoveAccessory={toggleAccessory}
                                isAccessorySelected={isAccessorySelected} onToggleAccessory={toggleAccessory}
                            />
                        </section>
                    </div>

                    <aside className="min-w-0 lg:sticky lg:top-28">
                        <FinancialSummaryBlock
                            priceDetails={priceDetails} accessoriesDailyTotal={accessoriesDailyTotal}
                            promoCode={promoCode} setPromoCode={setPromoCode} applyPromoCode={applyPromoCode}
                            removePromoCode={removePromoCode} promoCodeMessage={promoCodeMessage} promoCodeValid={promoCodeValid}
                            isLoading={isLoadingAvailability} isApplyingPromoCode={isApplyingPromoCode}
                            isSubmitting={isSubmitting} isFormValid={isFormValid}
                            formInvalidReason={formInvalidReason} cancellationPolicyNote={cancellationPolicyNote}
                            onCancel={() => setShowCancelDialog(true)} onAddMore={returnToCatalog}
                            onSubmit={handleSubmit} variant="default" showActions={true}
                        />
                    </aside>
                </div>
            </div>
            <CancelReservationDialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)} onConfirm={handleConfirmCancel} />
        </>
    );
}
