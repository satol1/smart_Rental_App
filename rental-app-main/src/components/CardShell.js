import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
export default function CardShell({ title, status, children, footer, className = "" }) {
    return (_jsxs(Card, { className: `w-full rounded-xl border shadow-sm hover:shadow-md transition ${className}`, children: [_jsxs(CardHeader, { className: "flex justify-between items-start", children: [_jsx("h3", { className: "text-lg font-semibold", children: title }), status && _jsx("div", { children: status })] }), _jsx(CardContent, { className: "space-y-2 text-sm text-gray-700", children: children }), footer && _jsx(CardFooter, { className: "pt-2", children: footer })] }));
}
