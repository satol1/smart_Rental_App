import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/shared/EmptyStateWithActions.tsx
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
export default function EmptyStateWithActions({ icon: Icon, title, description, primaryAction, secondaryAction, className = "" }) {
    return (_jsxs("div", { className: `text-center py-12 ${className}`, children: [_jsx("div", { className: "flex items-center justify-center mb-6", children: _jsx(Icon, { className: "w-16 h-16 text-gray-400" }) }), _jsx("h3", { className: "text-xl font-semibold text-gray-900 mb-3", children: title }), _jsx("p", { className: "text-gray-600 mb-8 max-w-md mx-auto leading-relaxed", children: description }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 justify-center items-center", children: [primaryAction && (_jsx(Button, { onClick: primaryAction.onClick, variant: primaryAction.variant || "default", className: primaryAction.className, size: "lg", children: primaryAction.label })), secondaryAction && (_jsx(Button, { onClick: secondaryAction.onClick, variant: secondaryAction.variant || "outline", className: secondaryAction.className, size: "lg", children: secondaryAction.label }))] })] }));
}
// Хук для стандартных действий
export function useEmptyStateActions() {
    const navigate = useNavigate();
    const goToEquipmentSelection = () => {
        navigate("/");
    };
    const goToHowItWorks = () => {
        navigate("/how-it-works");
    };
    return {
        goToEquipmentSelection,
        goToHowItWorks
    };
}
