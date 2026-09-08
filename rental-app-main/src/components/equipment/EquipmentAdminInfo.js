import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/equipment/EquipmentAdminInfo.tsx
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export default function EquipmentAdminInfo() {
    const { control, formState: { errors } } = useFormContext();
    return (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "notes", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438 (\u0432\u0438\u0434\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430\u043C/\u0430\u0434\u043C\u0438\u043D\u0430\u043C)" }), _jsx(Textarea, { id: "notes", ...control.register("notes"), rows: 3 }), errors.notes && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.notes.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "last_maintenance", children: "\u0414\u0430\u0442\u0430 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0422\u041E (\u0432\u0438\u0434\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0430\u043C/\u0430\u0434\u043C\u0438\u043D\u0430\u043C)" }), _jsx(Input, { id: "last_maintenance", type: "date", ...control.register("last_maintenance") }), errors.last_maintenance && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.last_maintenance.message })] })] }));
}
