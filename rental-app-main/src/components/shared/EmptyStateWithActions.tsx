// src/components/shared/EmptyStateWithActions.tsx


import { Button } from "@/components/ui/button";
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
                <Icon className="w-16 h-16 text-muted-foreground/60" />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-3">
                {title}
            </h3>

            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
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
