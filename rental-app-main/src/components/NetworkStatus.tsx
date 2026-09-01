// src/components/NetworkStatus.tsx
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { Circle } from "lucide-react"

export default function NetworkStatus() {
    const isOnline = useNetworkStatus()

    return (
        <div
            className={`fixed bottom-4 left-4 z-50 text-xs font-medium px-3 py-1.5 rounded-md shadow-lg transition
      ${isOnline ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"}
      `}
        >
            <div className="flex items-center gap-2">
                <Circle 
                    className={`w-3 h-3 fill-current ${
                        isOnline ? "text-green-500" : "text-red-500"
                    }`}
                />
                {isOnline ? "В сети" : "Нет подключения"}
            </div>
        </div>
    )
}
