// src/components/equipment-card/CardImage.tsx
import React from 'react';
import { Image as ImageIcon } from "lucide-react";

interface CardImageProps {
    imageUrl?: string;
    name: string;
}

export const CardImage: React.FC<CardImageProps> = ({ imageUrl, name }) => (
    <div className="relative w-full h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
            <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
            />
        ) : (
            <ImageIcon className="w-12 h-12 text-gray-300" />
        )}
        <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 group-hover:opacity-0 group-focus-within:opacity-0" />
    </div>
);