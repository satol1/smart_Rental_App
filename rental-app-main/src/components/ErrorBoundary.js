import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ErrorBoundary.tsx
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import ErrorMessage from "./ErrorMessage";
/**
 * Глобальный обработчик ошибок для всего приложения.
 * Показывает компонент `ErrorMessage` при сбое дерева компонентов.
 */
export default function ErrorBoundary({ children }) {
    return (_jsx(ReactErrorBoundary, { fallbackRender: ({ error, resetErrorBoundary }) => (_jsx(ErrorMessage, { error: error, onRetry: resetErrorBoundary })), children: children }));
}
