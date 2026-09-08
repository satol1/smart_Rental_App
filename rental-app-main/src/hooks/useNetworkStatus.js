// src/hooks/useNetworkStatus.ts
import { useEffect, useState } from "react";
/**
 * Хук отслеживает статус подключения (online/offline).
 * Возвращает true — если в сети, false — если оффлайн.
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);
    return isOnline;
}
