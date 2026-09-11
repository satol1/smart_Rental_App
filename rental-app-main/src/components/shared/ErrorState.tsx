// src/components/shared/ErrorState.tsx
// Единое состояние ошибки для страниц и виджетов: иконка + сообщение +
// опциональная кнопка повтора (refetch вместо window.location.reload).

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
    retryLabel?: string;
    compact?: boolean;
    className?: string;
}

export default function ErrorState({
    message = "Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.",
    onRetry,
    retryLabel = "Повторить",
    compact = false,
    className,
}: ErrorStateProps) {
    return (
        <div
            role="alert"
            className={cn(
                "flex flex-col items-center justify-center rounded-lg border border-border bg-card text-center",
                compact ? "gap-2 p-6" : "gap-4 py-12",
                className,
            )}
        >
            <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
            <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Что-то пошло не так</h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                    {message}
                </p>
            </div>
            {onRetry && (
                <Button variant="outline" onClick={onRetry} className="gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {retryLabel}
                </Button>
            )}
        </div>
    );
}
