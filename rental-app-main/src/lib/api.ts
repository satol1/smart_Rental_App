import axios from "axios"
import { getAccessToken, setAccessToken, clearAccessToken } from "@/core/services/tokenManager"

// Базовый инстанс axios для системных запросов (не использует интерцепторы, чтобы не было зацикливаний)
export const baseApi = axios.create({
  baseURL: "/api",
  withCredentials: true,
})

// Создаем основной axios instance
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // Всегда true для передачи сессионных cookie
})

// Вспомогательная функция для получения значения cookie по имени
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) {
    return match[2];
  }
  return null;
}

// Interceptor для обработки ответов с попыткой автообновления access-токена
let isRefreshing = false
let pendingRequests: Array<(token: string | null) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url || ''

    // Не пытаемся refresh для auth эндпоинтов - это приведет к бесконечным циклам
    const isAuthEndpoint = requestUrl.includes('/auth/logout') || requestUrl.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      // Если уже идёт refresh — ждём
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (token) {
              originalRequest.headers = originalRequest.headers || {}
              originalRequest.headers["Authorization"] = `Bearer ${token}`
            }
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true
      try {
        // Пытаемся обновить токен через чистый baseApi инстанс
        const refreshResp = await baseApi.post("/auth/refresh")
        const newAccessToken = refreshResp?.data?.access_token as string | undefined

        if (newAccessToken) {
          setAccessToken(newAccessToken)
          pendingRequests.forEach((cb) => cb(newAccessToken))
          pendingRequests = []

          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`
          return api(originalRequest)
        }
      } catch (e) {
        // Если refresh не доступен/упал — очищаем токен и пробрасываем ошибку
        clearAccessToken()
        pendingRequests.forEach((cb) => cb(null))
        pendingRequests = []

        // CustomEvent для логаута на клиенте (чтобы Zustand перехватил)
        window.dispatchEvent(new Event('auth-token-expired'));
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

// Interceptor для добавления токенов (Authorization и CSRF)
api.interceptors.request.use(
  async (config) => {
    // 1. Добавляем Authorization: Bearer <token> из памяти
    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    // 2. Добавляем CSRF-токен для методов, изменяющих состояние
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      let csrfToken = getCookie("fastapi-csrf-token")

      // Если токена нет в cookie, получаем его с сервера через чистый базовый инстанс
      if (!csrfToken) {
        try {
          const csrfResponse = await baseApi.get("/auth/csrf-token")
          csrfToken = csrfResponse.data.csrf_token
        } catch {
          // Игнорируем ошибку получения CSRF токена
        }
      }

      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken
      }
    }

    // 3. Устанавливаем Content-Type для POST/PUT/PATCH запросов с данными
    if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json'
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)