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
        return <p>Загрузка профиля...</p>
    }
    if (!user) {
        return <Navigate to="/" replace state={{ from: location.pathname }} />
    }
    if (role && !(Array.isArray(role) ? role.includes(user.role) : user.role === role)) {
        return <Navigate to="/forbidden" replace />
    }

    return <>{children}</>
}
