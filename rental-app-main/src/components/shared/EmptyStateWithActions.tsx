// src/components/shared/EmptyStateWithActions.tsx


import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

interface ActionButton {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
    className?: string;
}

interface EmptyStateWithActionsProps {
    icon: LucideIcon;
    title: string;
    description: string;
    primaryAction?: ActionButton;
    secondaryAction?: ActionButton;
    className?: string;
}

export default function EmptyStateWithActions({
    icon: Icon,
    title,
    description,
    primaryAction,
    secondaryAction,
    className = ""
}: EmptyStateWithActionsProps) {
    return (
        <div className={`text-center py-12 ${className}`}>
            <div className="flex items-center justify-center mb-6">
                <Icon className="w-16 h-16 text-gray-400" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {title}
            </h3>
            
            <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                {description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                {primaryAction && (
                    <Button
                        onClick={primaryAction.onClick}
                        variant={primaryAction.variant || "default"}
                        className={primaryAction.className}
                        size="lg"
                    >
                        {primaryAction.label}
                    </Button>
                )}
                
                {secondaryAction && (
                    <Button
                        onClick={secondaryAction.onClick}
                        variant={secondaryAction.variant || "outline"}
                        className={secondaryAction.className}
                        size="lg"
                    >
                        {secondaryAction.label}
                    </Button>
                )}
            </div>
        </div>
    );
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
