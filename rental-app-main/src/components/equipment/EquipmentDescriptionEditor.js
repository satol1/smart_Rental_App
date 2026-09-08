import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/equipment/EquipmentDescriptionEditor.tsx
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
export default function EquipmentDescriptionEditor() {
    const { control, formState: { errors } } = useFormContext();
    return (_jsxs("div", { children: [_jsx(Label, { htmlFor: "description", children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 (Markdown)" }), _jsx(Controller, { name: "description", control: control, render: ({ field }) => (_jsx("div", { "data-color-mode": "light", children: _jsx(MDEditor, { value: field.value ?? "", onChange: (val) => field.onChange(val ?? ""), previewOptions: { rehypePlugins: [[rehypeSanitize]] }, height: 250 }) })) }), errors.description && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.description.message })] }));
}
