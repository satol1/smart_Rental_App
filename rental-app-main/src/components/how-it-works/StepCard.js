import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export default function StepCard({ icon: Icon, stepNumber, title, description, className, colorScheme = 'blue' }) {
    // Цветовые схемы для разных шагов
    const colorSchemes = {
        blue: {
            circle: 'bg-sky-100',
            number: 'text-sky-700',
            iconBg: 'border-sky-100',
            icon: 'text-sky-600'
        },
        green: {
            circle: 'bg-emerald-100',
            number: 'text-emerald-700',
            iconBg: 'border-emerald-100',
            icon: 'text-emerald-600'
        },
        purple: {
            circle: 'bg-purple-100',
            number: 'text-purple-700',
            iconBg: 'border-purple-100',
            icon: 'text-purple-600'
        },
        orange: {
            circle: 'bg-orange-100',
            number: 'text-orange-700',
            iconBg: 'border-orange-100',
            icon: 'text-orange-600'
        }
    };
    const colors = colorSchemes[colorScheme];
    return (_jsx(Card, { className: cn("h-full transition-all duration-200 hover:shadow-md", className), children: _jsx(CardContent, { className: "p-6", children: _jsxs("div", { className: "flex flex-col items-center text-center space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: cn("w-16 h-16 rounded-full flex items-center justify-center", colors.circle), children: _jsx("span", { className: cn("text-2xl font-bold", colors.number), children: stepNumber }) }), _jsx("div", { className: cn("absolute -top-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border-2", colors.iconBg), children: _jsx(Icon, { className: cn("w-4 h-4", colors.icon) }) })] }), _jsx("h3", { className: "text-xl font-semibold text-gray-900", children: title }), _jsx("p", { className: "text-gray-600 leading-relaxed", children: description })] }) }) }));
}
