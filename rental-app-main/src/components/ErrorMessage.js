import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, RotateCcw } from "lucide-react";
export default function ErrorMessage({ error, onRetry }) {
    return (_jsxs("div", { className: "bg-red-50 border border-red-300 text-red-700 p-4 rounded-md shadow-sm text-sm", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(AlertCircle, { className: "w-4 h-4 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold mb-1", children: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430:" }), _jsx("pre", { className: "whitespace-pre-wrap break-words", children: error.message })] })] }), onRetry && (_jsxs("button", { onClick: onRetry, className: "mt-3 inline-flex items-center text-sm text-sky-700 hover:underline", children: [_jsx(RotateCcw, { className: "w-4 h-4 mr-1" }), "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C"] }))] }));
}
