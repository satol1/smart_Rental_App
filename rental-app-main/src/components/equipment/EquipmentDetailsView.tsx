// src/components/equipment/EquipmentDetailsView.tsx
import { useState } from "react";
import type { Equipment } from "@/types/equipment";
import { formatDateEuropean } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { Image as ImageIcon, Paperclip, Plus, Check } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { springs } from "@/lib/motion";
import { useReserveStore } from "@/store/reserveStore";

type Props = {
    equipment: Equipment;
    canViewAdminInfo: boolean;
    canToggleAccessories: boolean;
    // 👇 ИЗМЕНЕНИЕ: Новые пропсы для управления состоянием
    isMainSelected: boolean;
    stagedAccessoryIds: Set<number>;
    onToggleStagedAccessory: (accessoryId: number) => void;
};

export default function EquipmentDetailsView({
                                                 equipment,
                                                 canViewAdminInfo,
                                                 canToggleAccessories,
                                                 isMainSelected,
                                                 stagedAccessoryIds,
                                                 onToggleStagedAccessory
                                             }: Props) {
    const toggleAccessory = useReserveStore(state => state.toggleAccessory);
    const isAccessorySelected = useReserveStore(state => state.isAccessorySelected);
    
    // Состояние для управления текущим изображением
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const reducedMotion = useReducedMotion();

    // 👇 ИЗМЕНЕНИЕ: Обработчик теперь разделяет логику
    const handleToggleAccessory = (accessoryId: number) => {
        // Если основной товар уже в резерве, работаем с глобальным стором
        if (isMainSelected) {
            toggleAccessory(equipment.id, accessoryId);
        } else {
            // Иначе - работаем с локальным состоянием "отмеченных"
            onToggleStagedAccessory(accessoryId);
        }
    };

    const allImages = [equipment.image_url, ...(equipment.image_urls || [])].filter(Boolean) as string[];
    
    // Обработчик клика по миниатюре
    const handleThumbnailClick = (index: number) => {
        setCurrentImageIndex(index);
    };

    return (
        <div className="space-y-4 text-sm">
            {/* Основное изображение - большое по ширине, но не более 1/3 высоты окна */}
            {allImages.length > 0 ? (
                <div className="space-y-3">
                    {/* Главное изображение */}
                    <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-100 border shadow-sm">
                        <img 
                            src={allImages[currentImageIndex]} 
                            alt={`${equipment.name} - изображение ${currentImageIndex + 1}`} 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                    
                    {/* Миниатюры всех изображений */}
                    {allImages.length > 1 && (
                        <div className="flex overflow-x-auto space-x-2 pb-2">
                            {allImages.map((url, index) => (
                                <div 
                                    key={index} 
                                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                        index === currentImageIndex 
                                            ? 'border-primary ring-2 ring-primary/30' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => handleThumbnailClick(index)}
                                >
                                    <img 
                                        src={url} 
                                        alt={`${equipment.name} image ${index + 1}`} 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-lg border">
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                </div>
            )}

            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight pt-2">
                {equipment.equipment_type} {equipment.brand} {equipment.name}
            </h3>

            <div className="mt-2 space-y-1">
                <p><span className="font-medium text-gray-700">Цена:</span> {equipment.daily_rate} ₽ / день</p>
                <p><span className="font-medium text-gray-700">Состояние:</span> {equipment.condition}</p>
            </div>

            {equipment.accessories && equipment.accessories.length > 0 && (
                <div className="pt-3 mt-3 border-t">
                    <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-500"/>
                        Доступные аксессуары:
                    </p>
                    <ul className="space-y-1.5">
                        {equipment.accessories.map(acc => {
                            // 👇 ИЗМЕНЕНИЕ: Проверяем статус в зависимости от того, добавлен ли товар в резерв
                            const isAdded = isMainSelected
                                ? isAccessorySelected(equipment.id, acc.id)
                                : stagedAccessoryIds.has(acc.id);

                            return (
                                <li key={acc.id} className="flex justify-between items-center bg-gray-50/70 p-2 rounded-md hover:bg-gray-100 transition-colors">
                                    <div>
                                        <span className="font-medium">{acc.name}</span>
                                        <span className="text-xs text-gray-600 ml-2">{acc.price} ₽</span>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant={isAdded ? "default" : "outline"}
                                        className={`h-7 w-7 shrink-0 ${isAdded ? '' : 'hover:border-primary/50 hover:bg-info-soft hover:text-primary'}`}
                                        onClick={() => handleToggleAccessory(acc.id)}
                                        aria-label={isAdded ? "Убрать аксессуар" : "Добавить аксессуар"}
                                        aria-pressed={isAdded}
                                        disabled={!canToggleAccessories}
                                    >
                                        <AnimatePresence mode="wait" initial={false}>
                                            <motion.span
                                                key={isAdded ? 'check' : 'plus'}
                                                initial={{ scale: reducedMotion ? 1 : 0.5, opacity: 0, rotate: reducedMotion ? 0 : -90 }}
                                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                exit={{ scale: reducedMotion ? 1 : 0.5, opacity: 0, rotate: reducedMotion ? 0 : 90 }}
                                                transition={reducedMotion ? { duration: 0 } : springs.pop}
                                                className="grid place-items-center"
                                            >
                                                {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                            </motion.span>
                                        </AnimatePresence>
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* ... остальные блоки (описание, служебная информация) остаются без изменений ... */}
            {equipment.description && (
                <div className="pt-3 mt-3 border-t">
                    <p className="font-semibold text-gray-800 mb-1">Описание:</p>
                    <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-200">
                        <ReactMarkdown>{equipment.description}</ReactMarkdown>
                    </div>
                </div>
            )}

            {canViewAdminInfo && (equipment.notes || equipment.last_maintenance) && (
                <div className="pt-3 mt-3 border-t space-y-2">
                    <h4 className="text-sm font-semibold text-sky-700">Служебная информация:</h4>
                    {equipment.last_maintenance && (
                        <p className="text-xs text-gray-600"><strong>Последнее ТО:</strong> {formatDateEuropean(equipment.last_maintenance)}</p>
                    )}
                    {equipment.notes && (
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-0.5">Заметки:</p>
                            <p className="text-xs text-gray-500 whitespace-pre-wrap bg-gray-50 p-2 rounded-md border border-gray-200">{equipment.notes}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}