import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import logo from "@/assets/logo.webp";
export default function ReceiptHeader({ rentalId, createdAt, isCompact = false }) {
    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    if (isCompact) {
        return (_jsxs("div", { className: "text-center mb-2", children: [_jsxs("div", { className: "flex items-center justify-center gap-2 mb-1", children: [_jsx("img", { src: logo, alt: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F", className: "w-10 h-10" }), _jsxs("div", { children: [_jsx("h1", { className: "text-lg font-bold text-gray-900", children: "\u0426\u0438\u0444\u0440\u043E\u0432\u043E\u0439. \u0423\u043C\u043D\u0430\u044F \u0430\u0440\u0435\u043D\u0434\u0430 \u0442\u0435\u0445\u043D\u0438\u043A\u0438" }), _jsx("p", { className: "text-xs text-gray-600", children: "\u0418\u041F \u0421\u0430\u0434\u043E\u043C\u0446\u0435\u0432 \u0410\u043D\u0430\u0442\u043E\u043B\u0438\u0439 \u042E\u0440\u044C\u0435\u0432\u0438\u0447" })] })] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded p-2", children: [_jsxs("h2", { className: "text-base font-semibold text-blue-900", children: ["\u0411\u041B\u0410\u041D\u041A \u0410\u0420\u0415\u041D\u0414\u042B \u2116", rentalId] }), _jsxs("p", { className: "text-xs text-blue-700", children: ["\u0414\u0430\u0442\u0430 \u0432\u044B\u0434\u0430\u0447\u0438: ", formatDateTime(createdAt)] })] })] }));
    }
    return (_jsxs("div", { className: "text-center mb-8", children: [_jsxs("div", { className: "flex items-center justify-center gap-4 mb-4", children: [_jsx("img", { src: logo, alt: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F", className: "w-16 h-16" }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\u0426\u0438\u0444\u0440\u043E\u0432\u043E\u0439. \u0423\u043C\u043D\u0430\u044F \u0430\u0440\u0435\u043D\u0434\u0430 \u0442\u0435\u0445\u043D\u0438\u043A\u0438" }), _jsx("p", { className: "text-sm text-gray-600", children: "\u0418\u041F \u0421\u0430\u0434\u043E\u043C\u0446\u0435\u0432 \u0410\u043D\u0430\u0442\u043E\u043B\u0438\u0439 \u042E\u0440\u044C\u0435\u0432\u0438\u0447" })] })] }), _jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsxs("h2", { className: "text-xl font-semibold text-blue-900", children: ["\u0411\u041B\u0410\u041D\u041A \u0410\u0420\u0415\u041D\u0414\u042B \u2116", rentalId] }), _jsxs("p", { className: "text-sm text-blue-700", children: ["\u0414\u0430\u0442\u0430 \u0432\u044B\u0434\u0430\u0447\u0438: ", formatDateTime(createdAt)] })] })] }));
}
