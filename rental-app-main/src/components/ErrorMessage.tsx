import { AlertCircle, RotateCcw } from "lucide-react"

type Props = {
    error: Error
    onRetry?: () => void
}

export default function ErrorMessage({ error, onRetry }: Props) {
    return (
        <div className="bg-danger-soft border border-destructive/30 text-destructive p-4 rounded-md shadow-sm text-sm">
            <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                    <p className="font-semibold mb-1">Произошла ошибка:</p>
                    <pre className="whitespace-pre-wrap break-words">{error.message}</pre>
                </div>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-3 inline-flex items-center text-sm text-primary hover:underline"
                >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Повторить
                </button>
            )}
        </div>
    )
}
