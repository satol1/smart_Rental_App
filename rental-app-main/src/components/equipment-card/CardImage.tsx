// src/components/equipment-card/CardImage.tsx
import React from 'react';
import { Image as ImageIcon } from "lucide-react";

interface CardImageProps {
    imageUrl?: string;
    name: string;
}

export const CardImage: React.FC<CardImageProps> = ({ imageUrl, name }) => (
    <div className="relative w-full h-44 bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border/50">
        {imageUrl ? (
            <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                loading="lazy"
            />
        ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                <ImageIcon className="w-10 h-10 stroke-1" />
                <span className="text-[10px] mt-1 uppercase tracking-wider font-medium">Фото отсутствует</span>
            </div>
        )}
    </div>
);