import { useReserveSubmission } from "@/hooks/reservation/submission/useReserveSubmission"
import type { Equipment } from "@/types/equipment"

export default function ReservationList() {
    const {
        items,
        unavailableIdsFromAPI,
        submitMessage,
        reservationSuccess,
        removeItemFromStore,
        clearReserveStore,
        handleSubmit,
    } = useReserveSubmission()

    if (items.length === 0) return null

    return (
        <div className="mt-6 p-4 border rounded bg-white shadow-sm max-w-2xl mx-auto">
            <h2 className="text-lg font-bold mb-4">Выбранное оборудование:</h2>

            <ul className="space-y-2 mb-4">
                {items.map((item: Equipment) => (
                    <li
                        key={item.id}
                        className={`flex justify-between items-center border-b pb-1 ${
                            unavailableIdsFromAPI.includes(item.id) ? "bg-red-50 border-red-600" : ""
                        }`}
                    >
                        <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">
                                {item.brand} • {item.equipment_type}
                            </p>
                            {unavailableIdsFromAPI.includes(item.id) && (
                                <p className="text-xs text-red-600 pt-1">
                                    Это оборудование стало недоступным
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => removeItemFromStore(item.id)}
                            className="text-red-600 hover:underline text-sm"
                        >
                            Удалить
                        </button>
                    </li>
                ))}
            </ul>

            <div className="flex justify-between items-center">
                <button
                    onClick={clearReserveStore}
                    className="text-gray-600 hover:underline text-sm"
                >
                    Очистить всё
                </button>
                <button
                    onClick={handleSubmit}
                    className="bg-sky-700 text-white px-4 py-2 rounded hover:bg-sky-800 text-sm font-medium"
                    disabled={unavailableIdsFromAPI.length > 0}
                >
                    📤 Отправить резерв
                </button>
            </div>

            {submitMessage && (
                <p
                    className={`text-sm mt-3 text-center ${
                        reservationSuccess ? "text-green-700" : "text-red-600"
                    }`}
                >
                    {submitMessage}
                </p>
            )}
        </div>
    )
}
