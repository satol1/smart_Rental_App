// src/components/ui/CreatableSelect.tsx

import { useState, useMemo, useEffect } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Вспомогательный компонент: Диалог для создания нового элемента ---
const AddNewItemDialog = ({ open, onClose, onSave, title, description, label }: {
    open: boolean;
    onClose: () => void;
    onSave: (newItem: string) => void;
    title: string;
    description: string;
    label: string;
}) => {
    const [newItem, setNewItem] = useState("");

    const handleSave = () => {
        if (newItem.trim()) {
            onSave(newItem.trim());
        }
    };

    // Сбрасываем поле ввода, когда диалог открывается
    useEffect(() => {
        if (open) {
            setNewItem("");
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-item-name" className="text-right">{label}</Label>
                        <Input
                            id="new-item-name"
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            className="col-span-3"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                    <Button type="button" onClick={handleSave} disabled={!newItem.trim()}>Сохранить</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- Основной компонент CreatableSelect ---
interface CreatableSelectProps {
    value?: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    dialogTitle: string;
    dialogDescription: string;
    dialogLabel: string;
    className?: string;
}

export function CreatableSelect({
                                    value,
                                    onChange,
                                    options,
                                    placeholder = "Выберите значение...",
                                    dialogTitle,
                                    dialogDescription,
                                    dialogLabel,
                                    className
                                }: CreatableSelectProps) {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [customOptions, setCustomOptions] = useState<string[]>([]);

    const allOptions = useMemo(() => {
        const combined = new Set([...options, ...customOptions]);
        return Array.from(combined).sort((a, b) => a.localeCompare(b));
    }, [options, customOptions]);

    // Определяем текущее значение для Select
    const currentValue = useMemo(() => {
        if (!value || value.trim() === "") {
            return undefined;
        }
        // Возвращаем значение только если оно есть в опциях
        return allOptions.includes(value) ? value : undefined;
    }, [value, allOptions]);

    const handleSelect = (selectedValue: string) => {
        if (selectedValue === "add_new") {
            setIsAddingNew(true);
        } else {
            onChange(selectedValue);
        }
    };

    const handleSaveNew = (newItem: string) => {
        if (!allOptions.includes(newItem)) {
            setCustomOptions(prev => [...prev, newItem]);
        }
        onChange(newItem);
        setIsAddingNew(false);
    };

    return (
        <>
            <Select onValueChange={handleSelect} value={currentValue}>
                <SelectTrigger className={className}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {allOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                            {opt}
                        </SelectItem>
                    ))}
                    <SelectItem value="add_new" className="text-sky-600 font-semibold">
                        + Добавить новый...
                    </SelectItem>
                </SelectContent>
            </Select>

            <AddNewItemDialog
                open={isAddingNew}
                onClose={() => setIsAddingNew(false)}
                onSave={handleSaveNew}
                title={dialogTitle}
                description={dialogDescription}
                label={dialogLabel}
            />
        </>
    );
}