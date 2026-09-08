import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCopyEquipment } from "@/hooks/useAdminEquipment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
const copySchema = z.object({
    name: z.string().min(1, "Название обязательно"),
    serial_number: z.string().optional(),
    notes: z.string().optional(),
});
export default function EquipmentCopyDialog({ isOpen, onClose, sourceEquipment }) {
    const copyMutation = useCopyEquipment();
    // Правила хуков: useForm до guard'а (иначе смена исхода guard роняет React);
    // defaultValues безопасно переживают отсутствие sourceEquipment
    const form = useForm({
        resolver: zodResolver(copySchema),
        defaultValues: {
            name: `${sourceEquipment?.name ?? ""} (копия)`,
            serial_number: "",
            notes: `Скопировано из ID: ${sourceEquipment?.id ?? "?"}`,
        },
    });
    // Защита от null/undefined
    if (!sourceEquipment) {
        return null;
    }
    const onSubmit = async (data) => {
        try {
            await copyMutation.mutateAsync({
                sourceId: sourceEquipment.id,
                copyData: data,
            });
            onClose();
        }
        catch (error) {
            // Ошибки обрабатываются в хуке
        }
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u0431\u043E\u0440\u0443\u0434\u043E\u0432\u0430\u043D\u0438\u044F" }) }), _jsx(FormProvider, { ...form, children: _jsxs("form", { onSubmit: form.handleSubmit(onSubmit), className: "space-y-4", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *" }), _jsx(Input, { ...form.register("name") }), form.formState.errors.name && (_jsx("p", { className: "text-red-500 text-sm mt-1", children: form.formState.errors.name.message }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\u0421\u0435\u0440\u0438\u0439\u043D\u044B\u0439 \u043D\u043E\u043C\u0435\u0440" }), _jsx(Input, { ...form.register("serial_number") })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "\u0417\u0430\u043C\u0435\u0442\u043A\u0438" }), _jsx(Textarea, { ...form.register("notes"), rows: 3 })] })] }), _jsxs("div", { className: "space-y-2 p-4 bg-gray-50 rounded", children: [_jsx("h4", { className: "font-medium text-gray-900", children: "\u041A\u043E\u043F\u0438\u0440\u0443\u0435\u043C\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435:" }), _jsxs("div", { className: "grid grid-cols-2 gap-2 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0422\u0438\u043F:" }), _jsx("span", { className: "ml-2 text-gray-900", children: sourceEquipment.equipment_type })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0411\u0440\u0435\u043D\u0434:" }), _jsx("span", { className: "ml-2 text-gray-900", children: sourceEquipment.brand })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0421\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435:" }), _jsx("span", { className: "ml-2 text-gray-900", children: sourceEquipment.condition })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "\u0422\u0430\u0440\u0438\u0444:" }), _jsxs("span", { className: "ml-2 text-gray-900", children: [sourceEquipment.daily_rate, " \u20BD/\u0434\u0435\u043D\u044C"] })] })] })] }), _jsxs("div", { className: "flex justify-end gap-3 pt-4", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { type: "submit", disabled: copyMutation.isPending, children: copyMutation.isPending ? "Копирование..." : "Скопировать" })] })] }) })] }) }));
}
