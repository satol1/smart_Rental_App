// src/components/NetworkStatus.tsx
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { Circle } from "lucide-react"

export default function NetworkStatus() {
    const isOnline = useNetworkStatus()

    if (isOnline) return null

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 left-4 z-40 rounded-md bg-danger-soft px-3 py-2 text-xs font-medium text-destructive shadow-sm"
        >
            <div className="flex items-center gap-2">
                <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
                {"Нет подключения"}
            </div>
        </div>
    )
}
