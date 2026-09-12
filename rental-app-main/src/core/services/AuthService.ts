// src/core/services/AuthService.ts

import { api, baseApi } from "@/lib/api";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/core/services/tokenManager";
import type { RegisterSchema } from "@/lib/validationSchemas";
import type { UserOut } from "@/types/user";
import type { ApiToken, ApiRegisterResponse } from "@/types/api/schemas";

// Контракт авторизации берём из сгенерированных типов (npm run gen:api)
export type LoginResponse = ApiToken;
export type RegisterResponse = ApiRegisterResponse;

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
        } catch {
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
        } catch (error: unknown) {
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
        } catch (error: unknown) {
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
        } catch (error: unknown) {
            console.error("Ошибка при автоматическом входе после регистрации:", error);
            throw this.handleAuthError(error);
        }
    }

    /**
     * Получает профиль текущего пользователя
     */
    static async getCurrentUser(): Promise<UserOut> {
        try {
            // Пытаемся убедиться, что у нас есть access-токен (восстановим из refresh при необходимости)
            await this.ensureAccessToken();
            const response = await api.get<UserOut>("/auth/me");
            return response.data;
        } catch (error: unknown) {
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
            } catch {
                // Игнорируем, если эндпоинт отсутствует
            }
        } catch (error: unknown) {
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
    private static handleAuthError(error: unknown): AuthError {
        if (
            typeof error === "object" &&
            error !== null &&
            "response" in error &&
            typeof (error as { response?: unknown }).response === "object" &&
            (error as { response?: unknown }).response !== null
        ) {
            const response = (error as {
                response?: {
                    data?: {
                        detail?: unknown;
                        error_type?: string;
                        error_message?: string;
                    };
                };
            }).response;
            const data = response?.data;

            if (data) {
                let detail: string;

                // Если detail - это массив (ошибки валидации Pydantic)
                if (Array.isArray(data.detail)) {
                    detail = data.detail
                        .map((err) => (typeof err?.msg === "string" ? err.msg : ""))
                        .filter(Boolean)
                        .join(", ");
                } else if (typeof data.detail === "string") {
                    detail = data.detail;
                } else {
                    detail = JSON.stringify(data.detail) ?? "";
                }

                return {
                    detail: detail || "Произошла ошибка авторизации",
                    error_type: data.error_type,
                    error_message: data.error_message,
                };
            }
        }

        const message =
            typeof error === "object" && error !== null && "message" in error
                ? String((error as { message?: unknown }).message)
                : "";

        return {
            detail: message || "Неизвестная ошибка авторизации",
        };
    }

    /**
     * Валидирует токен авторизации
     */
    static async validateToken(): Promise<boolean> {
        try {
            await this.getCurrentUser();
            return true;
        } catch {
            return false;
        }
    }
}
