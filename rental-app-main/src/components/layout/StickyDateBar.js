import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/layout/StickyDateBar.tsx
import { memo } from 'react';
import CalendarDateInputRange from '@/components/calendar/CalendarDateInputRange';
import { cn } from '@/lib/utils';
const StickyDateBar = memo(function StickyDateBar({ isVisible }) {
    return (_jsx("div", { className: cn("fixed top-20 left-0 right-0 z-40 bg-background/90 backdrop-blur-sm border-b shadow-md p-2 transition-transform duration-300 ease-in-out", isVisible ? "translate-y-0" : "-translate-y-full"), children: _jsx("div", { className: "max-w-7xl mx-auto", children: _jsxs("div", { className: "flex items-center justify-center", children: [_jsx("div", { className: "text-sm font-medium text-gray-700 mr-4", children: "\u0412\u044B\u0431\u043E\u0440 \u0434\u0430\u0442:" }), _jsx(CalendarDateInputRange, { className: "flex-row gap-4" })] }) }) }));
});
export default StickyDateBar;
