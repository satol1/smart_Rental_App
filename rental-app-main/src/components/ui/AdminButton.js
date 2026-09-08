import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/AdminButton.tsx
import { useCurrentUser } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function AdminButton() {
    const { data: user, isLoading } = useCurrentUser();
    const navigate = useNavigate();
    const isAdmin = user?.role === "admin";
    const isManager = user?.role === "manager" || isAdmin;
    if (isLoading || !isManager)
        return null;
    return (_jsxs(Button, { onClick: () => navigate("/admin"), variant: "default", className: "bg-gray-800 hover:bg-gray-700", children: [_jsx(Shield, { className: "w-4 h-4 mr-2" }), isAdmin ? "Админ панель" : "Панель менеджера"] }));
}
