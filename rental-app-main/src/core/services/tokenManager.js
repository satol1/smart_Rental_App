// Простое in-memory хранилище access-токена на время жизни вкладки
let currentAccessToken = null;
export function getAccessToken() {
    return currentAccessToken;
}
export function setAccessToken(token) {
    currentAccessToken = token;
}
export function clearAccessToken() {
    currentAccessToken = null;
}
