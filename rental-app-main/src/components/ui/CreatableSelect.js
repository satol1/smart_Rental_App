import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/ui/CreatableSelect.tsx
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// --- Вспомогательный компонент: Диалог для создания нового элемента ---
const AddNewItemDialog = ({ open, onClose, onSave, title, description, label }) => {
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
    return (_jsx(Dialog, { open: open, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: title }), _jsx(DialogDescription, { children: description })] }), _jsx("div", { className: "grid gap-4 py-4", children: _jsxs("div", { className: "grid grid-cols-4 items-center gap-4", children: [_jsx(Label, { htmlFor: "new-item-name", className: "text-right", children: label }), _jsx(Input, { id: "new-item-name", value: newItem, onChange: (e) => setNewItem(e.target.value), className: "col-span-3", autoFocus: true, onKeyDown: (e) => { if (e.key === 'Enter')
                                    handleSave(); } })] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "button", onClick: handleSave, disabled: !newItem.trim(), children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] }) }));
};
export function CreatableSelect({ value, onChange, options, placeholder = "Выберите значение...", dialogTitle, dialogDescription, dialogLabel, className }) {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [customOptions, setCustomOptions] = useState([]);
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
    const handleSelect = (selectedValue) => {
        if (selectedValue === "add_new") {
            setIsAddingNew(true);
        }
        else {
            onChange(selectedValue);
        }
    };
    const handleSaveNew = (newItem) => {
        if (!allOptions.includes(newItem)) {
            setCustomOptions(prev => [...prev, newItem]);
        }
        onChange(newItem);
        setIsAddingNew(false);
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Select, { onValueChange: handleSelect, value: currentValue, children: [_jsx(SelectTrigger, { className: className, children: _jsx(SelectValue, { placeholder: placeholder }) }), _jsxs(SelectContent, { children: [allOptions.map((opt) => (_jsx(SelectItem, { value: opt, children: opt }, opt))), _jsx(SelectItem, { value: "add_new", className: "text-sky-600 font-semibold", children: "+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0439..." })] })] }), _jsx(AddNewItemDialog, { open: isAddingNew, onClose: () => setIsAddingNew(false), onSave: handleSaveNew, title: dialogTitle, description: dialogDescription, label: dialogLabel })] }));
}
