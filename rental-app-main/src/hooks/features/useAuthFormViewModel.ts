// src/hooks/features/useAuthFormViewModel.ts

import { useState, useEffect } from "react";
import { useForm, UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import { loginSchema, registerSchema, LoginSchema, RegisterSchema } from "@/lib/validationSchemas";
import { AuthService } from "@/core/services";

interface UseAuthFormViewModelProps {
    onSuccess?: () => void;
}

interface AuthFormState {
    isRegister: boolean;
    showPassword: boolean;
    isPrivacyModalOpen: boolean;
    isTermsModalOpen: boolean;
    loading: boolean;
    error: string | null;
}

interface AuthFormActions {
    toggleMode: () => void;
    togglePasswordVisibility: () => void;
    openPrivacyModal: () => void;
    closePrivacyModal: () => void;
    openTermsModal: () => void;
    closeTermsModal: () => void;
    handleSubmit: (data: LoginSchema | RegisterSchema) => Promise<void>;
    reset: () => void;
    isFormReady: () => boolean;
}

/**
 * Хук-ViewModel для управления состоянием и логикой формы авторизации.
 * Инкапсулирует всю бизнес-логику формы, оставляя компонент только для отображения.
 */
export const useAuthFormViewModel = ({ onSuccess }: UseAuthFormViewModelProps = {}): {
    state: AuthFormState;
    actions: AuthFormActions;
    form: ReturnType<typeof useForm<LoginSchema | RegisterSchema>>;
} => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Состояние формы
    const [isRegister, setIsRegister] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Настройка формы
    const form = useForm<LoginSchema | RegisterSchema>({
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

    const { reset, watch, formState } = form;

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

    const handleSubmit = async (data: LoginSchema | RegisterSchema) => {
        setLoading(true);
        setError(null);

        try {
            if (isRegister) {
                const registerData = data as RegisterSchema;
                
                // Дополнительная проверка на случай, если Zod по какой-то причине будет обойден
                if (!registerData.privacyPolicyAccepted || !registerData.termsAccepted) {
                    throw new Error("Необходимо принять условия использования и политику конфиденциальности.");
                }

                // Регистрируем пользователя
                await AuthService.register(registerData);
                
                // Автоматически входим после регистрации
                const loginResponse = await AuthService.loginAfterRegister(
                    registerData.email, 
                    registerData.password
                );

                // Сохраняем токен
                AuthService.setToken(loginResponse.access_token);

                // Обновляем кэш пользователя
                await queryClient.invalidateQueries({ queryKey: ["current_user"] });

                toast.success("Регистрация прошла успешно! Добро пожаловать!");
                reset();
                
                setTimeout(() => {
                    onSuccess?.();
                }, 100);

            } else {
                const loginData = data as LoginSchema;
                
                // Выполняем вход
                const loginResponse = await AuthService.login(loginData.email, loginData.password);

                // Сохраняем токен
                AuthService.setToken(loginResponse.access_token);

                // Обновляем кэш пользователя
                await queryClient.invalidateQueries({ queryKey: ["current_user"] });

                toast.success("Вход выполнен успешно! Добро пожаловать!");
                reset();
                
                setTimeout(() => {
                    onSuccess?.();
                }, 100);
            }
        } catch (err: any) {
            console.error("Auth error:", err);
            
            const errorMessage = err.detail || err.message || "Произошла ошибка. Попробуйте снова.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
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
        } else {
            // Для формы регистрации проверяем все обязательные поля и чекбоксы
            const formData = watch();
            const registerData = formData as RegisterSchema;
            
            return !!(
                registerData.email?.trim() &&
                registerData.password?.trim() &&
                registerData.fullName?.trim() &&
                registerData.privacyPolicyAccepted &&
                registerData.termsAccepted
            );
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
