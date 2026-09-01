// src/components/ErrorBoundary.tsx

import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary"
import ErrorMessage from "./ErrorMessage"

type Props = {
    children: React.ReactNode
}

/**
 * Глобальный обработчик ошибок для всего приложения.
 * Показывает компонент `ErrorMessage` при сбое дерева компонентов.
 */
export default function ErrorBoundary({ children }: Props) {
    return (
        <ReactErrorBoundary
            fallbackRender={({ error, resetErrorBoundary }) => (
                <ErrorMessage error={error} onRetry={resetErrorBoundary} />
            )}
        >
            {children}
        </ReactErrorBoundary>
    )
}
