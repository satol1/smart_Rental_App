// src/components/AuthForm.tsx

import { Controller } from "react-hook-form";
import { LoginSchema, RegisterSchema } from "@/lib/validationSchemas";
import { useAuthFormViewModel } from "@/hooks/features/useAuthFormViewModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Eye, EyeOff, Mail, Lock, User, LogIn, UserPlus, Phone, Calendar, Send } from "lucide-react";
import PrivacyPolicyModal from "@/components/shared/PrivacyPolicyModal";
import TermsOfServiceModal from "@/components/shared/TermsOfServiceModal";

interface AuthFormProps {
    onSuccess?: () => void; // <<< ИЗМЕНЕНИЕ: Добавлен пропс для callback при успешной авторизации
}

export default function AuthForm({ onSuccess }: AuthFormProps = {}) {
    const { state, actions, form } = useAuthFormViewModel({ onSuccess });
    
    const {
        register: formRegister,
        handleSubmit,
        control,
        trigger,
        formState: { errors, isValid },
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
                    <Label htmlFor="fullName">ФИО *</Label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input id="fullName" {...formRegister("fullName")} placeholder="Иван Иванов" className="pl-9" />
                    </div>
                    {isRegister && 'fullName' in errors && errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName.message}</p>}
                </div>
                <div>
                    <Label htmlFor="phone">Телефон</Label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field }) => (
                                <PhoneInput
                                    id="phone"
                                    {...field}
                                    placeholder="+7 (___) ___-__-__"
                                    className="pl-9"
                                    error={isRegister && 'phone' in errors && !!errors.phone}
                                    onBlur={() => trigger("phone")}
                                />
                            )}
                        />
                    </div>
                    {isRegister && 'phone' in errors && errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
                </div>
            </div>

            <div>
                <Label htmlFor="telegram">Telegram</Label>
                <div className="relative">
                    <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input id="telegram" {...formRegister("telegram_username")} placeholder="@username" className="pl-9" />
                </div>
                {isRegister && 'telegram_username' in errors && errors.telegram_username && <p className="text-xs text-red-600 mt-1">{errors.telegram_username.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="emailReg">Email *</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            id="emailReg" type="email" {...formRegister("email")}
                            placeholder="your@email.com" className="pl-9"
                            onBlur={() => trigger("email")}
                        />
                    </div>
                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                    <Label htmlFor="passwordReg">Пароль *</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input id="passwordReg" type={showPassword ? "text" : "password"} {...formRegister("password")} placeholder="••••••••" className="pl-9 pr-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={togglePasswordVisibility}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
                </div>
            </div>

            <div className="space-y-3 pt-2">
                <Controller
                    control={control}
                    name="privacyPolicyAccepted"
                    render={({ field }) => (
                        <div className="flex items-start space-x-2">
                            <Checkbox id="privacy" checked={field.value} onCheckedChange={field.onChange} />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="privacy" className="text-sm font-normal cursor-pointer">
                                    Я согласен с <button type="button" onClick={openPrivacyModal} className="text-sky-600 hover:underline">политикой обработки персональных данных</button> *
                                </Label>
                                {isRegister && 'privacyPolicyAccepted' in errors && errors.privacyPolicyAccepted && <p className="text-xs text-red-600">{errors.privacyPolicyAccepted.message}</p>}
                            </div>
                        </div>
                    )}
                />
                <Controller
                    control={control}
                    name="termsAccepted"
                    render={({ field }) => (
                        <div className="flex items-start space-x-2">
                            <Checkbox id="terms" checked={field.value} onCheckedChange={field.onChange} />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                                    Я принимаю <button type="button" onClick={openTermsModal} className="text-sky-600 hover:underline">условия использования сервиса</button> *
                                </Label>
                                {isRegister && 'termsAccepted' in errors && errors.termsAccepted && <p className="text-xs text-red-600">{errors.termsAccepted.message}</p>}
                            </div>
                        </div>
                    )}
                />
            </div>
        </>
    );

    const loginFields = (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="emailLogin">Email</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        id="emailLogin" type="email" {...formRegister("email")}
                        placeholder="your@email.com" className="pl-9"
                        onBlur={() => trigger("email")}
                    />
                </div>
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>
            <div>
                <Label htmlFor="passwordLogin">Пароль</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input id="passwordLogin" type={showPassword ? "text" : "password"} {...formRegister("password")} placeholder="••••••••" className="pl-9 pr-10" />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={togglePasswordVisibility}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>
                {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>
        </div>
    );

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
                <h2 className="text-xl font-semibold text-center">{isRegister ? "Регистрация" : "Вход в аккаунт"}</h2>

                {/* Только при регистрации рендерятся чекбоксы и registrationFields */}
                {isRegister ? registrationFields : loginFields}

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* +++ НАЧАЛО: Измененный блок кнопок +++ */}
                <div className="pt-4 border-t space-y-4">
                    <Button 
                        type="submit" 
                        disabled={!isFormReady() || loading} 
                        className="w-full"
                    >
                        {loading ? "Загрузка..." : (isRegister ? <><UserPlus className="mr-2 h-4 w-4" />Зарегистрироваться</> : <><LogIn className="mr-2 h-4 w-4" />Войти</>)}
                    </Button>
                    <div className="flex justify-center items-center gap-4 text-sm">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.href = "/calendar"}
                        >
                            <Calendar className="mr-2 h-4 w-4" />
                            Календарь
                        </Button>
                        <Button type="button" variant="link" onClick={toggleMode} className="text-gray-600">
                            {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта?"}
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