import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/equipment/EquipmentMediaInfo.tsx
import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export default function EquipmentMediaInfo() {
    const { control, formState: { errors } } = useFormContext();
    return (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "image_url", children: "URL \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F" }), _jsx(Input, { id: "image_url", ...control.register("image_url"), placeholder: "https://example.com/main_image.jpg" }), errors.image_url && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.image_url.message })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "image_urls", children: "URL \u0434\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 (\u043A\u0430\u0436\u0434\u044B\u0439 \u0441 \u043D\u043E\u0432\u043E\u0439 \u0441\u0442\u0440\u043E\u043A\u0438)" }), _jsx(Controller, { name: "image_urls", control: control, render: ({ field }) => (_jsx(Textarea, { id: "image_urls", placeholder: "https://example.com/image1.jpg\nhttps://example.com/image2.jpg", value: Array.isArray(field.value) ? field.value.join('\n') : '', onChange: (e) => {
                                const urls = e.target.value ? e.target.value.split('\n') : [];
                                field.onChange(urls);
                            }, rows: 4 })) }), errors.image_urls && _jsx("p", { className: "text-xs text-red-600 mt-1", children: errors.image_urls.message })] })] }));
}
