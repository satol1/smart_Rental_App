import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useCurrentUser } from "@/hooks/useProfile"

type Props = {
    children: ReactNode
    role?: string | string[] // Добавлен пропс role
}

export default function RequireAuth({ children, role }: Props) {
    const { data: user, isLoading } = useCurrentUser()
    const location = useLocation()

    if (isLoading) {
        return (
            <div
                className="flex min-h-[40vh] items-center justify-center"
                role="status"
                aria-live="polite"
            >
                <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    <span>Загрузка профиля…</span>
                </div>
            </div>
        )
    }
    if (!user) {
        // Полный путь (с query) — после входа completeAuth вернёт пользователя назад;
        // Header видит state.from на главной и сам открывает диалог входа
        return (
            <Navigate
                to="/"
                replace
                state={{ from: `${location.pathname}${location.search}` }}
            />
        )
    }
    if (role && !(Array.isArray(role) ? role.includes(user.role) : user.role === role)) {
        return <Navigate to="/forbidden" replace />
    }

    return <>{children}</>
}
