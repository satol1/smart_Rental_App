import axios from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/core/services/tokenManager";
// Базовый инстанс axios для системных запросов.
// Interceptor'ы здесь сознательно НЕ работают с авторизацией/refresh (чтобы не
// было зацикливаний), но CSRF-заголовок нужен и этим запросам: refresh/logout —
// мутирующие эндпоинты с CSRF-проверкой на бэкенде.
export const baseApi = axios.create({
    baseURL: "/api",
    withCredentials: true,
});
// Создаем основной axios instance
export const api = axios.create({
    baseURL: "/api",
    withCredentials: true, // Всегда true для передачи сессионных cookie
});
// Вспомогательная функция для получения значения cookie по имени
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
        return match[2];
    }
    return null;
}
// Получение актуального CSRF-токена: из cookie, а если её нет — с сервера.
// GET /auth/csrf-token сам не требует CSRF, поэтому рекурсии здесь нет.
async function ensureCsrfToken() {
    let csrfToken = getCookie("fastapi-csrf-token");
    if (!csrfToken) {
        try {
            const csrfResponse = await baseApi.get("/auth/csrf-token");
            csrfToken = csrfResponse.data.csrf_token ?? null;
        }
        catch {
            // Игнорируем ошибку получения CSRF токена
        }
    }
    return csrfToken;
}
function isMutatingMethod(method) {
    return ['post', 'put', 'delete', 'patch'].includes(method?.toLowerCase() || '');
}
// По ответу понимаем, что это отказ CSRF (токен истёк через час/ротация):
// бэкенд отвечает 403 с detail "CSRF validation failed: ..."
function isCsrfFailure(error) {
    const resp = error?.response;
    const detail = typeof resp?.data?.detail === 'string' ? resp.data.detail : '';
    return resp?.status === 403 && detail.includes('CSRF');
}
// ─── baseApi: CSRF на мутирующие запросы (refresh, logout и др.) ───
baseApi.interceptors.request.use(async (config) => {
    if (isMutatingMethod(config.method)) {
        const csrfToken = await ensureCsrfToken();
        if (csrfToken) {
            config.headers["X-CSRF-Token"] = csrfToken;
        }
    }
    return config;
}, (error) => Promise.reject(error));
// ─── baseApi: перевыпуск CSRF и повтор запроса при 403 CSRF ───
baseApi.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (isCsrfFailure(error) && originalRequest && !originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true;
        try {
            const csrfResponse = await baseApi.get("/auth/csrf-token");
            const freshToken = csrfResponse.data.csrf_token;
            if (freshToken) {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers["X-CSRF-Token"] = freshToken;
                return baseApi(originalRequest);
            }
        }
        catch {
            // падаем в исходную ошибку
        }
    }
    return Promise.reject(error);
});
// Interceptor для обработки ответов с попыткой автообновления access-токена
let isRefreshing = false;
let pendingRequests = [];
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    // Истёкший CSRF-токен (живёт 1 час): перевыпускаем и повторяем один раз
    if (isCsrfFailure(error) && originalRequest && !originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true;
        try {
            const csrfResponse = await baseApi.get("/auth/csrf-token");
            const freshToken = csrfResponse.data.csrf_token;
            if (freshToken) {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers["X-CSRF-Token"] = freshToken;
                return api(originalRequest);
            }
        }
        catch {
            // падаем в исходную ошибку
        }
    }
    // Не пытаемся refresh для auth эндпоинтов - это приведет к бесконечным циклам
    const isAuthEndpoint = requestUrl.includes('/auth/logout') || requestUrl.includes('/auth/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;
        // Если уже идёт refresh — ждём
        if (isRefreshing) {
            return new Promise((resolve) => {
                pendingRequests.push((token) => {
                    if (token) {
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers["Authorization"] = `Bearer ${token}`;
                    }
                    resolve(api(originalRequest));
                });
            });
        }
        isRefreshing = true;
        try {
            // Пытаемся обновить токен через чистый baseApi инстанс
            const refreshResp = await baseApi.post("/auth/refresh");
            const newAccessToken = refreshResp?.data?.access_token;
            if (newAccessToken) {
                setAccessToken(newAccessToken);
                pendingRequests.forEach((cb) => cb(newAccessToken));
                pendingRequests = [];
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            }
        }
        catch (e) {
            // Если refresh не доступен/упал — очищаем токен и пробрасываем ошибку
            clearAccessToken();
            pendingRequests.forEach((cb) => cb(null));
            pendingRequests = [];
            // CustomEvent для логаута на клиенте (чтобы Zustand перехватил)
            window.dispatchEvent(new Event('auth-token-expired'));
        }
        finally {
            isRefreshing = false;
        }
    }
    return Promise.reject(error);
});
// Interceptor для добавления токенов (Authorization и CSRF)
api.interceptors.request.use(async (config) => {
    // 1. Добавляем Authorization: Bearer <token> из памяти
    const accessToken = getAccessToken();
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // 2. Добавляем CSRF-токен для методов, изменяющих состояние
    if (isMutatingMethod(config.method)) {
        const csrfToken = await ensureCsrfToken();
        if (csrfToken) {
            config.headers["X-CSRF-Token"] = csrfToken;
        }
    }
    // 3. Устанавливаем Content-Type для POST/PUT/PATCH запросов с данными
    if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
        if (!config.headers['Content-Type']) {
            config.headers['Content-Type'] = 'application/json';
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
