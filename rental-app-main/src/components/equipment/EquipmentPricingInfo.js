import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/equipment/EquipmentPricingInfo.tsx
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EQUIPMENT_CONDITIONS } from "@/constants/equipmentConstants";
export default function EquipmentPricingInfo() {
    const { control, formState: { errors } } = useFormContext();
    return (_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "condition", children: "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 *" }), _jsx(Controller, { name: "condition", control: control, render: ({ field }) => (_jsxs(Select, { onValueChange: field.onChange, defaultValue: field.value, value: field.value, children: [_jsx(SelectTrigger, { id: "condition", children: _jsx(SelectValue, { placeholder: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435" }) }), _jsx(SelectContent, { children: EQUIPMENT_CONDITIONS.map((condition) => (_jsx(SelectItem, { value: condition, children: condition }, condition))) })] })) }), errors.condition && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.condition.message }))] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "daily_rate", children: "\u0426\u0435\u043D\u0430 \u0437\u0430 \u0434\u0435\u043D\u044C (\u20BD)" }), _jsx(Controller, { name: "daily_rate", control: control, render: ({ field }) => (_jsx(Input, { ...field, id: "daily_rate", type: "number", value: field.value ?? "", onChange: (e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? undefined : parseFloat(val));
                            }, step: "0.01", placeholder: "0.00" })) }), errors.daily_rate && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.daily_rate.message })] })] }));
}
