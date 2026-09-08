// src/hooks/features/useAuthFormViewModel.ts
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { loginSchema, registerSchema } from "@/lib/validationSchemas";
import { AuthService } from "@/core/services";
/**
 * Хук-ViewModel для управления состоянием и логикой формы авторизации.
 * Инкапсулирует всю бизнес-логику формы, оставляя компонент только для отображения.
 */
export const useAuthFormViewModel = ({ onSuccess } = {}) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    // После успешного входа возвращаем пользователя на маршрут, с которого его
    // редиректило на авторизацию (RequireAuth кладёт его в location.state.from)
    const completeAuth = () => {
        const from = location.state?.from;
        if (from && from !== location.pathname) {
            navigate(from, { replace: true });
            return;
        }
        onSuccess?.();
    };
    // Состояние формы
    const [isRegister, setIsRegister] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Настройка формы
    const form = useForm({
        resolver: zodResolver(isRegister ? registerSchema : loginSchema),
        mode: "onBlur",
        defaultValues: isRegister ? {
            email: "",
            password: "",
            fullName: "",
            phone: "",
            telegram_username: "",
            privacyPolicyAccepted: false,
            termsAccepted: false,
        } : {
            email: "",
            password: "",
        }
    });
    const { reset, watch } = form;
    // Сбрасываем форму при смене режима
    useEffect(() => {
        reset(isRegister ? {
            email: "",
            password: "",
            fullName: "",
            phone: "",
            telegram_username: "",
            privacyPolicyAccepted: false,
            termsAccepted: false,
        } : {
            email: "",
            password: "",
        });
    }, [isRegister, reset]);
    // Очищаем ошибки при смене режима
    useEffect(() => {
        setError(null);
    }, [isRegister]);
    // Действия формы
    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError(null);
    };
    const togglePasswordVisibility = () => {
        setShowPassword(prev => !prev);
    };
    const openPrivacyModal = () => {
        setIsPrivacyModalOpen(true);
    };
    const closePrivacyModal = () => {
        setIsPrivacyModalOpen(false);
    };
    const openTermsModal = () => {
        setIsTermsModalOpen(true);
    };
    const closeTermsModal = () => {
        setIsTermsModalOpen(false);
    };
    const handleSubmit = async (data) => {
        setLoading(true);
        setError(null);
        try {
            if (isRegister) {
                const registerData = data;
                // Дополнительная проверка на случай, если Zod по какой-то причине будет обойден
                if (!registerData.privacyPolicyAccepted || !registerData.termsAccepted) {
                    throw new Error(t("auth.termsRequired"));
                }
                // Регистрируем пользователя
                await AuthService.register(registerData);
                // Автоматически входим после регистрации
                const loginResponse = await AuthService.loginAfterRegister(registerData.email, registerData.password);
                // Сохраняем токен
                AuthService.setToken(loginResponse.access_token);
                // Обновляем кэш пользователя
                await queryClient.invalidateQueries({ queryKey: ["current_user"] });
                toast.success(t("auth.registerSuccess"));
                reset();
                setTimeout(() => {
                    completeAuth();
                }, 100);
            }
            else {
                const loginData = data;
                // Выполняем вход
                const loginResponse = await AuthService.login(loginData.email, loginData.password);
                // Сохраняем токен
                AuthService.setToken(loginResponse.access_token);
                // Обновляем кэш пользователя
                await queryClient.invalidateQueries({ queryKey: ["current_user"] });
                toast.success(t("auth.loginSuccess"));
                reset();
                setTimeout(() => {
                    completeAuth();
                }, 100);
            }
        }
        catch (err) {
            console.error("Auth error:", err);
            const errDetail = typeof err === "object" && err !== null && "detail" in err
                ? String(err.detail)
                : undefined;
            const errMsg = err instanceof Error ? err.message : undefined;
            const errorMessage = errDetail || errMsg || t("errors.generic");
            setError(errorMessage);
            toast.error(errorMessage);
        }
        finally {
            setLoading(false);
        }
    };
    const resetForm = () => {
        reset();
        setError(null);
    };
    // Функция для проверки готовности формы
    // Используем встроенную валидацию Zod через react-hook-form
    const isFormReady = () => {
        if (!isRegister) {
            // Для формы входа проверяем только обязательные поля
            const formData = watch();
            return !!(formData.email?.trim() && formData.password?.trim());
        }
        else {
            // Для формы регистрации проверяем все обязательные поля и чекбоксы
            const formData = watch();
            const registerData = formData;
            return !!(registerData.email?.trim() &&
                registerData.password?.trim() &&
                registerData.fullName?.trim() &&
                registerData.privacyPolicyAccepted &&
                registerData.termsAccepted);
        }
    };
    return {
        state: {
            isRegister,
            showPassword,
            isPrivacyModalOpen,
            isTermsModalOpen,
            loading,
            error,
        },
        actions: {
            toggleMode,
            togglePasswordVisibility,
            openPrivacyModal,
            closePrivacyModal,
            openTermsModal,
            closeTermsModal,
            handleSubmit,
            reset: resetForm,
            isFormReady,
        },
        form,
    };
};
