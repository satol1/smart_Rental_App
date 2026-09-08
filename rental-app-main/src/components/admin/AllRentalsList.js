import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ClipboardX } from "lucide-react";
import AdminRentalCard from "./AdminRentalCard";
export default function AllRentalsList({ rentals, onReturn, highlightId, elementRef, getHighlightClasses }) {
    if (!rentals || rentals.length === 0) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center text-center p-12 space-y-4 bg-gray-50/50 rounded-lg border-2 border-dashed", children: [_jsx(ClipboardX, { className: "w-16 h-16 text-gray-400" }), _jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "\u0410\u0440\u0435\u043D\u0434\u044B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B" }), _jsx("p", { className: "text-sm text-gray-500", children: "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0444\u0438\u043B\u044C\u0442\u0440\u044B \u0438\u043B\u0438 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441." })] }));
    }
    return (_jsx("div", { className: "space-y-4", children: rentals.map((rental) => (_jsx(AdminRentalCard, { rental: rental, onReturn: onReturn, highlightId: highlightId ?? undefined, elementRef: highlightId === rental.id ? elementRef : undefined, getHighlightClasses: getHighlightClasses }, rental.id))) }));
}
