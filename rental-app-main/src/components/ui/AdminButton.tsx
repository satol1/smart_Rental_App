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

    if (isLoading || !isManager) return null;

    return (
        <Button
            onClick={() => navigate("/admin")}
            variant="secondary"
        >
            <Shield />
            {isAdmin ? "Админ панель" : "Панель менеджера"}
        </Button>
    );
}
