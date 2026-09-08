import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/admin/HolidayManager.tsx
import { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '@/hooks/useAdminHolidays';
import { useGetHolidayRules, useCreateWeeklyRule, useImportPublicHolidays, useDeleteHolidayRule } from '@/hooks/useAdminHolidayRules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, CalendarPlus, Globe, Repeat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// --- Новый компонент для формы еженедельных правил ---
function WeeklyRuleForm({ isLoading }) {
    const [dayOfWeek, setDayOfWeek] = useState("6"); // 6 = Воскресенье
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-31`);
    const createRuleMutation = useCreateWeeklyRule();
    const daysOfWeek = [
        { label: "Понедельник", value: "0" },
        { label: "Вторник", value: "1" },
        { label: "Среда", value: "2" },
        { label: "Четверг", value: "3" },
        { label: "Пятница", value: "4" },
        { label: "Суббота", value: "5" },
        { label: "Воскресенье", value: "6" },
    ];
    const handleSubmit = (e) => {
        e.preventDefault();
        const selectedDay = daysOfWeek.find(d => d.value === dayOfWeek);
        createRuleMutation.mutate({
            day_of_week: parseInt(dayOfWeek, 10),
            start_date: new Date(startDate),
            end_date: new Date(endDate),
            description: `Еженедельный выходной: ${selectedDay?.label}`
        });
    };
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Repeat, { className: "w-5 h-5" }), " \u0415\u0436\u0435\u043D\u0435\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u0435"] }), _jsx(CardDescription, { children: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u043C\u0438 \u0432\u0441\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0434\u043D\u0438 \u043D\u0435\u0434\u0435\u043B\u0438 \u0432 \u043F\u0435\u0440\u0438\u043E\u0434\u0435." })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { children: "\u0414\u0435\u043D\u044C \u043D\u0435\u0434\u0435\u043B\u0438" }), _jsxs(Select, { value: dayOfWeek, onValueChange: setDayOfWeek, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: daysOfWeek.map(day => (_jsx(SelectItem, { value: day.value, children: day.label }, day.value))) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "\u041D\u0430\u0447\u0438\u043D\u0430\u044F \u0441" }), _jsx(Input, { type: "date", value: startDate, onChange: e => setStartDate(e.target.value) })] }), _jsxs("div", { children: [_jsx(Label, { children: "\u0417\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u044F" }), _jsx(Input, { type: "date", value: endDate, onChange: e => setEndDate(e.target.value) })] })] }), _jsx(Button, { type: "submit", disabled: isLoading || createRuleMutation.isPending, className: "w-full sm:w-auto", children: createRuleMutation.isPending ? "Создание..." : "Создать правило" })] }) })] }));
}
// --- Новый компонент для формы импорта ---
function PublicHolidayImportForm({ isLoading }) {
    const [year, setYear] = useState(new Date().getFullYear());
    const [countryCode, setCountryCode] = useState("RU");
    const importMutation = useImportPublicHolidays();
    const handleSubmit = (e) => {
        e.preventDefault();
        importMutation.mutate({ year, country_code: countryCode });
    };
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Globe, { className: "w-5 h-5" }), " \u0418\u043C\u043F\u043E\u0440\u0442 \u0433\u043E\u0441. \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u043A\u043E\u0432"] }), _jsx(CardDescription, { children: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0435 \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u043A\u0438 \u0434\u043B\u044F \u0441\u0442\u0440\u0430\u043D\u044B." })] }), _jsx(CardContent, { children: _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col sm:flex-row items-end gap-4", children: [_jsxs("div", { className: "flex-grow", children: [_jsx(Label, { children: "\u0413\u043E\u0434" }), _jsx(Input, { type: "number", value: year, onChange: e => setYear(parseInt(e.target.value, 10)) })] }), _jsxs("div", { className: "flex-grow", children: [_jsx(Label, { children: "\u041A\u043E\u0434 \u0441\u0442\u0440\u0430\u043D\u044B (ISO 3166-1)" }), _jsx(Input, { value: countryCode, onChange: e => setCountryCode(e.target.value.toUpperCase()), placeholder: "RU" })] }), _jsx(Button, { type: "submit", disabled: isLoading || importMutation.isPending, children: importMutation.isPending ? "Импорт..." : "Импортировать" })] }) })] }));
}
// --- Основной компонент HolidayManager ---
export default function HolidayManager() {
    const [month, setMonth] = useState(new Date());
    const [description, setDescription] = useState("");
    const [conflict, setConflict] = useState(null);
    const [autoExtension, setAutoExtension] = useState(null);
    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);
    const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidays(startDate, endDate);
    const createMutation = useCreateHoliday();
    const deleteMutation = useDeleteHoliday();
    const { data: rules = [], isLoading: isLoadingRules } = useGetHolidayRules();
    const deleteRuleMutation = useDeleteHolidayRule();
    const holidayDates = useMemo(() => holidays.map((h) => h.date), [holidays]);
    const holidaySet = useMemo(() => new Set(holidays.map((h) => format(h.date, "yyyy-MM-dd"))), [holidays]);
    const handleDaySelect = (day) => {
        if (!day)
            return;
        if (holidaySet.has(format(day, "yyyy-MM-dd"))) {
            toast.info("Этот день уже является выходным.");
            return;
        }
        createMutation.mutate({
            date: format(day, "yyyy-MM-dd"),
            description: description || undefined,
        }, {
            onError: (error) => {
                if (error.response?.status === 409) {
                    setConflict({
                        date: day,
                        description: description,
                        conflicting_reservation_ids: error.response.data.detail.conflicting_reservation_ids,
                    });
                }
            },
            onSuccess: (response) => {
                setDescription("");
                // Проверяем, есть ли информация об автоматическом продлении
                if (response?.data?.auto_extension) {
                    setAutoExtension(response.data.auto_extension ?? null);
                }
            }
        });
    };
    const handleForceCreate = () => {
        if (!conflict)
            return;
        createMutation.mutate({ date: format(conflict.date, "yyyy-MM-dd"), description: conflict.description, force: true }, {
            onSuccess: (response) => {
                setConflict(null);
                // Проверяем, есть ли информация об автоматическом продлении
                if (response?.data?.auto_extension) {
                    setAutoExtension(response.data.auto_extension ?? null);
                }
            }
        });
    };
    const handleDeleteHoliday = (date) => {
        if (window.confirm(`Вы уверены, что хотите удалить выходной ${format(date, 'dd.MM.yyyy')}?`)) {
            deleteMutation.mutate(date);
        }
    };
    const handleDeleteRule = (ruleId) => {
        if (window.confirm(`Вы уверены, что хотите удалить это правило и все созданные им будущие выходные?`)) {
            deleteRuleMutation.mutate(ruleId);
        }
    };
    const isLoading = isLoadingHolidays || isLoadingRules;
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsx(WeeklyRuleForm, { isLoading: isLoading }), _jsx(PublicHolidayImportForm, { isLoading: isLoading })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(CalendarPlus, { className: "w-5 h-5" }), " \u0420\u0443\u0447\u043D\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435"] }), _jsx(CardDescription, { children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0430\u0442\u0443 \u0432 \u043A\u0430\u043B\u0435\u043D\u0434\u0430\u0440\u0435, \u0447\u0442\u043E\u0431\u044B \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0435\u0435 \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u043C, \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0438\u0442\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439." })] }), _jsxs(CardContent, { className: "grid grid-cols-1 md:grid-cols-2 gap-8", children: [_jsxs("div", { children: [_jsxs("div", { className: "space-y-2 mb-4", children: [_jsx(Label, { htmlFor: "holiday-desc", children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 (\u043D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E)" }), _jsx(Input, { id: "holiday-desc", placeholder: "\u041D\u0430\u043F\u0440\u0438\u043C\u0435\u0440, \u041A\u043E\u0440\u043F\u043E\u0440\u0430\u0442\u0438\u0432", value: description, onChange: (e) => setDescription(e.target.value) })] }), _jsx("div", { className: "flex justify-center border rounded-md p-2", children: _jsx(DayPicker, { mode: "single", locale: ru, month: month, onMonthChange: setMonth, onSelect: handleDaySelect, modifiers: { holidays: holidayDates }, modifiersClassNames: { holidays: 'bg-red-100 text-red-800 rounded-md' }, footer: isLoadingHolidays ? _jsx("p", { className: "text-center text-sm p-2", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }) : _jsxs("p", { className: "text-center text-sm p-2", children: ["\u0412\u044B\u0431\u0440\u0430\u043D \u043C\u0435\u0441\u044F\u0446: ", format(month, "LLLL yyyy", { locale: ru })] }) }) })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-md font-semibold mb-4", children: "\u0412\u044B\u0445\u043E\u0434\u043D\u044B\u0435 \u0432 \u044D\u0442\u043E\u043C \u043C\u0435\u0441\u044F\u0446\u0435:" }), holidays.length > 0 ? (_jsx("div", { className: "space-y-2 max-h-96 overflow-y-auto pr-2", children: holidays.map((holiday) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 rounded-md", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium", children: format(holiday.date, 'PPP', { locale: ru }) }), holiday.description && _jsxs("span", { className: "text-gray-600 text-sm ml-2", children: ["- ", holiday.description] })] }), _jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleDeleteHoliday(holiday.date), disabled: deleteMutation.isPending, "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u044B\u0445\u043E\u0434\u043D\u043E\u0439 \u0434\u0435\u043D\u044C", children: _jsx(Trash2, { className: "h-4 w-4 text-red-500", "aria-hidden": "true" }) })] }, holiday.date.toString()))) })) : (_jsx("p", { className: "text-sm text-gray-500", children: "\u0412 \u044D\u0442\u043E\u043C \u043C\u0435\u0441\u044F\u0446\u0435 \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u0435 \u043D\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u044B." }))] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438" }) }), _jsx(CardContent, { children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "\u041E\u043F\u0438\u0441\u0430\u043D\u0438\u0435" }), _jsx(TableHead, { children: "\u0422\u0438\u043F" }), _jsx(TableHead, { children: "\u0414\u0430\u0442\u0430 \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u044F" }), _jsx(TableHead, { className: "text-right", children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx(TableBody, { children: isLoadingRules ? _jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, className: "text-center", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u0440\u0430\u0432\u0438\u043B..." }) }) :
                                        rules.length === 0 ? _jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, className: "text-center", children: "\u041D\u0435\u0442 \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u043F\u0440\u0430\u0432\u0438\u043B." }) }) :
                                            rules.map(rule => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: rule.description }), _jsx(TableCell, { children: _jsx("span", { className: "text-xs font-mono bg-slate-100 px-2 py-1 rounded", children: rule.rule_type }) }), _jsx(TableCell, { children: format(new Date(rule.created_at), 'dd.MM.yyyy HH:mm') }), _jsx(TableCell, { className: "text-right", children: _jsx(Button, { variant: "ghost", size: "icon", onClick: () => handleDeleteRule(rule.id), disabled: deleteRuleMutation.isPending, "aria-label": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043F\u0440\u0430\u0432\u0438\u043B\u043E", children: _jsx(Trash2, { className: "h-4 w-4 text-red-500", "aria-hidden": "true" }) }) })] }, rule.id))) })] }) })] }), _jsx(Dialog, { open: !!conflict, onOpenChange: () => setConflict(null), children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u041E\u0431\u043D\u0430\u0440\u0443\u0436\u0435\u043D \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442" }), _jsxs(DialogDescription, { children: ["\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0434\u0430\u0442\u0430 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0434\u0430\u0442\u043E\u0439 \u043D\u0430\u0447\u0430\u043B\u0430 \u0438\u043B\u0438 \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0434\u043B\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u0440\u0435\u0437\u0435\u0440\u0432\u043E\u0432:", _jsxs("strong", { className: "block my-2", children: ["ID: ", conflict?.conflicting_reservation_ids.join(', ')] }), "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u044D\u0442\u043E\u0433\u043E \u0434\u043D\u044F \u0432\u044B\u0445\u043E\u0434\u043D\u044B\u043C \u0441\u0434\u0435\u043B\u0430\u0435\u0442 \u044D\u0442\u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u044B \u043D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u043C\u0438. \u0412\u044B \u0443\u0432\u0435\u0440\u0435\u043D\u044B, \u0447\u0442\u043E \u0445\u043E\u0442\u0438\u0442\u0435 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C?"] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "ghost", onClick: () => setConflict(null), children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx(Button, { variant: "destructive", onClick: handleForceCreate, disabled: createMutation.isPending, children: createMutation.isPending ? "Обработка..." : "Да, все равно назначить" })] })] }) }), _jsx(Dialog, { open: !!autoExtension, onOpenChange: () => setAutoExtension(null), children: _jsxs(DialogContent, { className: "max-w-2xl", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043F\u0440\u043E\u0434\u043B\u0435\u043D\u0438\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E" }), _jsx(DialogDescription, { children: autoExtension?.message })] }), _jsxs("div", { className: "space-y-4", children: [autoExtension?.extended_rentals && autoExtension.extended_rentals.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-sm mb-2", children: "\u041F\u0440\u043E\u0434\u043B\u0435\u043D\u043D\u044B\u0435 \u0430\u0440\u0435\u043D\u0434\u044B:" }), _jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto", children: autoExtension.extended_rentals.map(rental => (_jsxs("div", { className: "text-sm bg-blue-50 p-2 rounded", children: [_jsxs("strong", { children: ["\u0410\u0440\u0435\u043D\u0434\u0430 #", rental.id, ":"] }), " ", rental.old_end_date, " \u2192 ", rental.new_end_date] }, rental.id))) })] })), autoExtension?.extended_reservations && autoExtension.extended_reservations.length > 0 && (_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-sm mb-2", children: "\u041F\u0440\u043E\u0434\u043B\u0435\u043D\u043D\u044B\u0435 \u0440\u0435\u0437\u0435\u0440\u0432\u044B:" }), _jsx("div", { className: "space-y-2 max-h-32 overflow-y-auto", children: autoExtension.extended_reservations.map(reservation => (_jsxs("div", { className: "text-sm bg-green-50 p-2 rounded", children: [_jsxs("strong", { children: ["\u0420\u0435\u0437\u0435\u0440\u0432 #", reservation.id, ":"] }), " ", reservation.old_end_date, " \u2192 ", reservation.new_end_date] }, reservation.id))) })] })), _jsxs("div", { className: "text-sm text-gray-600 bg-gray-50 p-3 rounded", children: [_jsx("strong", { children: "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u0434\u0435\u043D\u044C:" }), " ", autoExtension?.next_working_day] })] }), _jsx(DialogFooter, { children: _jsx(Button, { onClick: () => setAutoExtension(null), children: "\u041F\u043E\u043D\u044F\u0442\u043D\u043E" }) })] }) })] }));
}
