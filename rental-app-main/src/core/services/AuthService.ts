// src/core/services/AuthService.ts

import { api, baseApi } from "@/lib/api";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/core/services/tokenManager";
import type { LoginSchema, RegisterSchema } from "@/lib/validationSchemas";

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export interface RegisterResponse {
    id: number;
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export interface AuthError {
    detail: string;
    error_type?: string;
    error_message?: string;
}

/**
 * Централизованный сервис для работы с авторизацией.
 * Инкапсулирует все API вызовы, связанные с аутентификацией и регистрацией.
 */
export class AuthService {
    // Доступ к токену через tokenManager (in-memory)

    /**
     * Гарантирует наличие валидного access-токена в памяти.
     * Если токена нет, пытается получить его через refresh-cookie (silent refresh).
     * Возвращает актуальный токен или null.
     */
    static async ensureAccessToken(): Promise<string | null> {
        const existing = getAccessToken();
        if (existing) return existing;

        try {
            const refreshResp = await baseApi.post("/auth/refresh");
            const newAccessToken = refreshResp?.data?.access_token as string | undefined;
            if (newAccessToken) {
                setAccessToken(newAccessToken);
                return newAccessToken;
            }
        } catch (_) {
            // Молча игнорируем, если refresh недоступен/просрочен
        }
        return null;
    }
    /**
     * Выполняет вход пользователя в систему
     */
    static async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response = await api.post<LoginResponse>(
                "/auth/token",
                new URLSearchParams({ username: email, password }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error("Ошибка при входе в систему:", error);
            throw this.handleAuthError(error);
        }
    }

    /**
     * Регистрирует нового пользователя
     */
    static async register(data: RegisterSchema): Promise<RegisterResponse> {
        try {
            // Преобразуем данные в формат API
            const apiPayload = {
                email: data.email,
                password: data.password,
                full_name: data.fullName,
                phone: data.phone,
                telegram_username: data.telegram_username,
                privacy_policy_accepted: data.privacyPolicyAccepted,
                terms_accepted: data.termsAccepted,
            };

            const response = await api.post<RegisterResponse>("/auth/register", apiPayload);
            return response.data;
        } catch (error: any) {
            console.error("Ошибка при регистрации:", error);
            throw this.handleAuthError(error);
        }
    }

    /**
     * Выполняет автоматический вход после регистрации
     */
    static async loginAfterRegister(email: string, password: string): Promise<LoginResponse> {
        try {
            return await this.login(email, password);
        } catch (error: any) {
            console.error("Ошибка при автоматическом входе после регистрации:", error);
            throw this.handleAuthError(error);
        }
    }

    /**
     * Получает профиль текущего пользователя
     */
    static async getCurrentUser(): Promise<any> {
        try {
            // Пытаемся убедиться, что у нас есть access-токен (восстановим из refresh при необходимости)
            await this.ensureAccessToken();
            const response = await api.get("/auth/me");
            return response.data;
        } catch (error: any) {
            console.error("Ошибка при получении профиля пользователя:", error);
            throw this.handleAuthError(error);
        }
    }

    /**
     * Выходит из системы
     */
    static async logout(): Promise<void> {
        try {
            // Очищаем токен из памяти
            clearAccessToken();

            // При наличии эндпоинта разлогина — инвалидируем refresh cookie на сервере
            try {
                await baseApi.post("/auth/logout");
            } catch (_) {
                // Игнорируем, если эндпоинт отсутствует
            }
        } catch (error: any) {
            console.error("Ошибка при выходе из системы:", error);
            // Не выбрасываем ошибку, так как очистка localStorage всегда должна происходить
        }
    }

    /**
     * Проверяет, авторизован ли пользователь
     */
    static isAuthenticated(): boolean {
        return !!getAccessToken();
    }

    /**
     * Получает токен авторизации
     */
    static getToken(): string | null {
        return getAccessToken();
    }

    /**
     * Сохраняет токен авторизации
     */
    static setToken(token: string): void {
        setAccessToken(token);
    }

    /**
     * Обрабатывает ошибки авторизации
     */
    private static handleAuthError(error: any): AuthError {
        if (error.response?.data) {
            let detail = error.response.data.detail;

            // Если detail - это массив (ошибки валидации Pydantic)
            if (Array.isArray(detail)) {
                detail = detail.map((err: any) => err.msg).join(", ");
            } else if (typeof detail !== 'string') {
                detail = JSON.stringify(detail);
            }

            return {
                detail: detail || "Произошла ошибка авторизации",
                error_type: error.response.data.error_type,
                error_message: error.response.data.error_message,
            };
        }

        return {
            detail: error.message || "Неизвестная ошибка авторизации",
        };
    }

    /**
     * Валидирует токен авторизации
     */
    static async validateToken(): Promise<boolean> {
        try {
            await this.getCurrentUser();
            return true;
        } catch (error) {
            return false;
        }
    }
}
