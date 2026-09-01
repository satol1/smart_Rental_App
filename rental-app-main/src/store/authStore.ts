// src/store/authStore.ts

import { create } from "zustand"
import { api, baseApi } from "@/lib/api"
import { setAccessToken, clearAccessToken } from "@/core/services/tokenManager"
import { queryClient } from "@/lib/queryClient"

// <<< ИЗМЕНЕНИЕ: Обновляем тип данных для регистрации
type RegisterPayload = {
    full_name: string
    email: string
    password: string
    phone?: string
    telegram_username?: string
    privacy_policy_accepted: boolean
    terms_accepted: boolean
}

type AuthStore = {
    loading: boolean
    error: string | null
    login: (email: string, password: string) => Promise<boolean>
    register: (data: RegisterPayload) => Promise<boolean>
    logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
    loading: false,
    error: null,

    login: async (email, password) => {
        set({ loading: true, error: null })
        try {
            const response = await api.post(
                "/auth/token",
                new URLSearchParams({ username: email, password }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            )

            const token = response.data.access_token
            setAccessToken(token)

            // ✅ Обновляем кэш пользователя
            await queryClient.invalidateQueries({ queryKey: ["current_user"] })

            // Возвращаем true при успешной авторизации
            return true
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } }
            set({
                error: error?.response?.data?.detail || "Ошибка входа",
            })
            // Возвращаем false при ошибке
            return false
        } finally {
            set({ loading: false })
        }
    },

    // <<< ИЗМЕНЕНИЕ: Обновляем функцию register для отправки всех полей
    register: async (data) => {
        set({ loading: true, error: null })
        try {
            await api.post("/auth/register", data) // Отправляем полный объект `data`

            // Автоматически входим после регистрации
            const response = await api.post(
                "/auth/token",
                new URLSearchParams({ username: data.email, password: data.password }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            )

            const token = response.data.access_token
            setAccessToken(token)

            // ✅ Обновляем кэш пользователя
            await queryClient.invalidateQueries({ queryKey: ["current_user"] })

            // Возвращаем true при успешной регистрации
            return true
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: any } } }

            // Обрабатываем ошибки валидации Pydantic
            let errorMessage = "Ошибка регистрации"
            if (error?.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    // Ошибки валидации Pydantic
                    errorMessage = error.response.data.detail
                        .map((e: any) => `${e.loc?.join('.')}: ${e.msg}`)
                        .join('; ')
                } else if (typeof error.response.data.detail === 'string') {
                    // Обычная ошибка
                    errorMessage = error.response.data.detail
                }
            }

            set({
                error: errorMessage,
            })
            // Возвращаем false при ошибке
            return false
        } finally {
            set({ loading: false })
        }
    },

    logout: async () => {
        // Очищаем токен из памяти
        clearAccessToken()

        // КРИТИЧНО: вызываем API logout для удаления refresh cookie на сервере
        try {
            await baseApi.post("/auth/logout")
        } catch {
            // Игнорируем ошибку - локальная очистка всегда происходит
        }

        // Очищаем кэш пользователя
        queryClient.invalidateQueries({ queryKey: ["current_user"] })
    },
}))