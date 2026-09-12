import React from "react";

type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
    className?: string;
};

export function Avatar({ className = "", ...props }: AvatarProps) {
    return (
        <div
            className={`inline-flex items-center justify-center rounded-full bg-muted text-foreground ${className}`}
            {...props}
        />
    );
}

type AvatarFallbackProps = React.HTMLAttributes<HTMLDivElement> & {
    className?: string;
};

export function AvatarFallback({ className = "", ...props }: AvatarFallbackProps) {
    return (
        <div
            className={`flex h-full w-full items-center justify-center rounded-full ${className}`}
            {...props}
        />
    );
}

export default Avatar;

