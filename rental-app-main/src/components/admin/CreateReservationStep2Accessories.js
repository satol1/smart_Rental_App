import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/CreateReservationStep2Accessories.tsx
import { Controller } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip } from "lucide-react";
import { useCreateReservationContext } from "@/contexts/CreateReservationContext";
export const CreateReservationStep2Accessories = () => {
    const { form, equipmentWithAccessories } = useCreateReservationContext();
    const { control } = form;
    return (_jsx("div", { className: "space-y-4 overflow-hidden flex flex-col flex-1", children: _jsx(ScrollArea, { className: "flex-1 -mx-6 px-6", children: _jsx("div", { className: "space-y-4 pb-4", children: equipmentWithAccessories.map(equipmentItem => (_jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [_jsx(Paperclip, { className: "h-4 w-4" }), equipmentItem.name] }) }), _jsx(CardContent, { children: _jsx(Controller, { name: `selected_accessories.${equipmentItem.id}`, control: control, render: ({ field }) => (_jsx("div", { className: "space-y-2", children: equipmentItem.accessories.map(acc => (_jsxs("div", { className: "flex items-center justify-between hover:bg-slate-50 p-2 rounded", children: [_jsxs(Label, { htmlFor: `acc-${equipmentItem.id}-${acc.id}`, className: "flex items-center gap-2 font-normal cursor-pointer", children: [_jsx(Checkbox, { id: `acc-${equipmentItem.id}-${acc.id}`, checked: field.value?.includes(acc.id), onCheckedChange: (checked) => {
                                                            const currentIds = field.value || [];
                                                            const newIds = checked ? [...currentIds, acc.id] : currentIds.filter(id => id !== acc.id);
                                                            field.onChange(newIds);
                                                        } }), acc.name] }), _jsxs("span", { className: "text-xs text-muted-foreground", children: [acc.price, " \u20BD"] })] }, acc.id))) })) }) })] }, equipmentItem.id))) }) }) }));
};
