// src/components/AuthForm.tsx

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Controller } from "react-hook-form";
import { useAuthFormViewModel } from "@/hooks/features/useAuthFormViewModel";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus, Phone, Calendar, Send } from "lucide-react";
import PrivacyPolicyModal from "@/components/shared/PrivacyPolicyModal";
import TermsOfServiceModal from "@/components/shared/TermsOfServiceModal";

interface AuthFormProps {
    embedded?: boolean;
    onSuccess?: () => void; // <<< ИЗМЕНЕНИЕ: Добавлен пропс для callback при успешной авторизации
}

export default function AuthForm({ onSuccess, embedded = false }: AuthFormProps = {}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { state, actions, form } = useAuthFormViewModel({ onSuccess });
    
    const {
        register: formRegister,
        handleSubmit,
        control,
        trigger,
        formState: { errors },
    } = form;

    const {
        isRegister,
        showPassword,
        isPrivacyModalOpen,
        isTermsModalOpen,
        loading,
        error,
    } = state;

    const {
        toggleMode,
        togglePasswordVisibility,
        openPrivacyModal,
        closePrivacyModal,
        openTermsModal,
        closeTermsModal,
        handleSubmit: handleFormSubmit,
        isFormReady,
    } = actions;

    const registrationFields = (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="fullName">{t("auth.fields.fullName")} *</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="fullName" autoComplete="name" {...formRegister("fullName")} placeholder="Иван Иванов" className="pl-9" />
                    </div>
                    {isRegister && 'fullName' in errors && errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                    <Label htmlFor="phone">{t("auth.fields.phone")}</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field }) => (
                                <PhoneInput
                                    id="phone"
                                    autoComplete="tel"
                                    {...field}
                                    placeholder="+7 (___) ___-__-__"
                                    className="pl-9"
                                    error={isRegister && 'phone' in errors && !!errors.phone}
                                    onBlur={() => trigger("phone")}
                                />
                            )}
                        />
                    </div>
                    {isRegister && 'phone' in errors && errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
                </div>
            </div>

            <div>
                <Label htmlFor="telegram">{t("auth.fields.telegram")}</Label>
                <div className="relative">
                    <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="telegram" {...formRegister("telegram_username")} placeholder="@username" className="pl-9" />
                </div>
                {isRegister && 'telegram_username' in errors && errors.telegram_username && <p className="text-xs text-destructive mt-1">{errors.telegram_username.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="emailReg">{t("auth.fields.email")} *</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="emailReg" type="email" autoComplete="email" {...formRegister("email")}
                            placeholder="your@email.com" className="pl-9"
                            onBlur={() => trigger("email")}
                        />
                    </div>
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>
                <div>
                    <Label htmlFor="passwordReg">{t("auth.fields.password")} *</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="passwordReg" autoComplete="new-password" type={showPassword ? "text" : "password"} {...formRegister("password")} placeholder="••••••••" className="pl-9 pr-12" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11" onClick={togglePasswordVisibility} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>
                            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                        </Button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <Controller
                    control={control}
                    name="privacyPolicyAccepted"
                    render={({ field }) => (
                        <div className="flex items-start gap-3">
                            <Checkbox id="privacy" checked={field.value ?? false} onCheckedChange={field.onChange} />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="privacy" className="text-sm font-normal leading-relaxed cursor-pointer">
                                    {t("auth.consent.privacyText")} <button type="button" onClick={openPrivacyModal} className="text-primary hover:underline">{t("auth.consent.privacyLink")}</button> *
                                </Label>
                                {isRegister && 'privacyPolicyAccepted' in errors && errors.privacyPolicyAccepted && <p className="text-xs text-destructive">{errors.privacyPolicyAccepted.message}</p>}
                            </div>
                        </div>
                    )}
                />
                <Controller
                    control={control}
                    name="termsAccepted"
                    render={({ field }) => (
                        <div className="flex items-start gap-3">
                            <Checkbox id="terms" checked={field.value ?? false} onCheckedChange={field.onChange} />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                                    {t("auth.consent.termsText")} <button type="button" onClick={openTermsModal} className="text-primary hover:underline">{t("auth.consent.termsLink")}</button> *
                                </Label>
                                {isRegister && 'termsAccepted' in errors && errors.termsAccepted && <p className="text-xs text-destructive">{errors.termsAccepted.message}</p>}
                            </div>
                        </div>
                    )}
                />
            </div>
        </>
    );

    const loginFields = (
        <div className="grid gap-4">
            <div>
                <Label htmlFor="emailLogin">{t("auth.fields.email")}</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="emailLogin" type="email" autoComplete="email" {...formRegister("email")}
                        placeholder="your@email.com" className="pl-9"
                        onBlur={() => trigger("email")}
                    />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
                <Label htmlFor="passwordLogin">{t("auth.fields.password")}</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="passwordLogin" autoComplete="current-password" type={showPassword ? "text" : "password"} {...formRegister("password")} placeholder="••••••••" className="pl-9 pr-12" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11" onClick={togglePasswordVisibility} aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}>
                        {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
        </div>
    );

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit(handleFormSubmit)} className={cn("space-y-6 [&_label]:mb-2 [&_label]:inline-block", !embedded && "rounded-lg border border-border bg-card p-6")}>
                <h2 className={cn("text-xl font-semibold", embedded && "sr-only")}>{isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}</h2>

                {/* Только при регистрации рендерятся чекбоксы и registrationFields */}
                {isRegister ? registrationFields : loginFields}

                {error && (
                    <div className="rounded-md bg-danger-soft p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* +++ НАЧАЛО: Измененный блок кнопок +++ */}
                <div className="pt-4 border-t space-y-4">
                    <Button 
                        type="submit" 
                        disabled={!isFormReady() || loading} 
                        className="w-full"
                        aria-busy={loading}
                    >
                        {loading ? t("common.loading") : (isRegister ? <><UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />{t("auth.submitRegister")}</> : <><LogIn className="mr-2 h-4 w-4" aria-hidden="true" />{t("auth.submitLogin")}</>)}
                    </Button>
                    <div className="flex flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/calendar")}
                        >
                            <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                            {t("nav.calendar")}
                        </Button>
                        <Button type="button" variant="link" onClick={toggleMode} className="text-muted-foreground">
                            {isRegister ? t("auth.hasAccount") : t("auth.noAccount")}
                        </Button>
                    </div>
                </div>
                {/* +++ КОНЕЦ: Измененный блок кнопок +++ */}
            </form>
            
            {/* Модальные окна */}
            <PrivacyPolicyModal 
                open={isPrivacyModalOpen} 
                onOpenChange={closePrivacyModal} 
            />
            <TermsOfServiceModal 
                open={isTermsModalOpen} 
                onOpenChange={closeTermsModal} 
            />
        </div>
    );
}
