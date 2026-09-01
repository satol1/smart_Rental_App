import { toast } from "sonner"

export function handleQueryError(error: unknown) {
    const message =
        error instanceof Error
            ? error.message
            : typeof error === "string"
                ? error
                : "Неизвестная ошибка запроса"
    toast.error(message)
    console.error("[Query error]", error)
}
