// src/components/admin/HolidayManager.tsx

import { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { ru } from 'date-fns/locale';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useHolidays, useCreateHoliday, useDeleteHoliday, type HolidayWithDate } from '@/hooks/useAdminHolidays';
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

type ConflictInfo = {
    date: Date;
    description: string;
    conflicting_reservation_ids: number[];
};

type AutoExtensionInfo = {
    message: string;
    next_working_day: string;
    extended_rentals: Array<{
        id: number;
        old_end_date: string;
        new_end_date: string;
    }>;
    extended_reservations: Array<{
        id: number;
        old_end_date: string;
        new_end_date: string;
    }>;
};

// --- Новый компонент для формы еженедельных правил ---
function WeeklyRuleForm({ isLoading }: { isLoading: boolean }) {
    const [dayOfWeek, setDayOfWeek] = useState<string>("6"); // 6 = Воскресенье
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(`${new Date().getFullYear()}-12-31`);
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedDay = daysOfWeek.find(d => d.value === dayOfWeek);
        createRuleMutation.mutate({
            day_of_week: parseInt(dayOfWeek, 10),
            start_date: new Date(startDate),
            end_date: new Date(endDate),
            description: `Еженедельный выходной: ${selectedDay?.label}`
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Repeat className="w-5 h-5" /> Еженедельные выходные</CardTitle>
                <CardDescription>Автоматически сделать выходными все выбранные дни недели в периоде.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <Label>День недели</Label>
                            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {daysOfWeek.map(day => (
                                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Начиная с</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <Label>Заканчивая</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <Button type="submit" disabled={isLoading || createRuleMutation.isPending} className="w-full sm:w-auto">
                        {createRuleMutation.isPending ? "Создание..." : "Создать правило"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

// --- Новый компонент для формы импорта ---
function PublicHolidayImportForm({ isLoading }: { isLoading: boolean }) {
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [countryCode, setCountryCode] = useState<string>("RU");
    const importMutation = useImportPublicHolidays();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        importMutation.mutate({ year, country_code: countryCode });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Импорт гос. праздников</CardTitle>
                <CardDescription>Автоматически добавить официальные праздники для страны.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-4">
                    <div className="flex-grow">
                        <Label>Год</Label>
                        <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value, 10))} />
                    </div>
                    <div className="flex-grow">
                        <Label>Код страны (ISO 3166-1)</Label>
                        <Input value={countryCode} onChange={e => setCountryCode(e.target.value.toUpperCase())} placeholder="RU" />
                    </div>
                    <Button type="submit" disabled={isLoading || importMutation.isPending}>
                        {importMutation.isPending ? "Импорт..." : "Импортировать"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}


// --- Основной компонент HolidayManager ---
export default function HolidayManager() {
    const [month, setMonth] = useState(new Date());
    const [description, setDescription] = useState("");
    const [conflict, setConflict] = useState<ConflictInfo | null>(null);
    const [autoExtension, setAutoExtension] = useState<AutoExtensionInfo | null>(null);

    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);

    const { data: holidays = [], isLoading: isLoadingHolidays } = useHolidays(startDate, endDate);
    const createMutation = useCreateHoliday();
    const deleteMutation = useDeleteHoliday();

    const { data: rules = [], isLoading: isLoadingRules } = useGetHolidayRules();
    const deleteRuleMutation = useDeleteHolidayRule();

    const holidayDates = useMemo(() => holidays.map((h: HolidayWithDate) => h.date), [holidays]);
    const holidaySet = useMemo(() => new Set(holidays.map((h: HolidayWithDate) => format(h.date, "yyyy-MM-dd"))), [holidays]);

    const handleDaySelect = (day: Date | undefined) => {
        if (!day) return;

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
        if (!conflict) return;
        createMutation.mutate(
            { date: format(conflict.date, "yyyy-MM-dd"), description: conflict.description, force: true },
            { 
                onSuccess: (response) => {
                    setConflict(null);
                    // Проверяем, есть ли информация об автоматическом продлении
                    if (response?.data?.auto_extension) {
                        setAutoExtension(response.data.auto_extension ?? null);
                    }
                }
            }
        );
    };

    const handleDeleteHoliday = (date: Date) => {
        if (window.confirm(`Вы уверены, что хотите удалить выходной ${format(date, 'dd.MM.yyyy')}?`)) {
            deleteMutation.mutate(date);
        }
    };

    const handleDeleteRule = (ruleId: number) => {
        if (window.confirm(`Вы уверены, что хотите удалить это правило и все созданные им будущие выходные?`)) {
            deleteRuleMutation.mutate(ruleId);
        }
    };

    const isLoading = isLoadingHolidays || isLoadingRules;

    return (
        <div className="space-y-6">

            <div className="space-y-4">
                <WeeklyRuleForm isLoading={isLoading} />
                <PublicHolidayImportForm isLoading={isLoading} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CalendarPlus className="w-5 h-5" /> Ручное управление</CardTitle>
                    <CardDescription>Выберите дату в календаре, чтобы сделать ее выходным, или удалите существующий.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="space-y-2 mb-4">
                            <Label htmlFor="holiday-desc">Название (необязательно)</Label>
                            <Input id="holiday-desc" placeholder="Например, Корпоратив" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div className="flex justify-center border rounded-md p-2">
                            <DayPicker
                                mode="single" locale={ru} month={month} onMonthChange={setMonth}
                                onSelect={handleDaySelect} modifiers={{ holidays: holidayDates }}
                                modifiersClassNames={{ holidays: 'bg-red-100 text-red-800 rounded-md' }}
                                footer={isLoadingHolidays ? <p className="text-center text-sm p-2">Загрузка...</p> : <p className="text-center text-sm p-2">Выбран месяц: {format(month, "LLLL yyyy", { locale: ru })}</p>}
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-semibold mb-4">Выходные в этом месяце:</h3>
                        {holidays.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                {holidays.map((holiday: HolidayWithDate) => (
                                    <div key={holiday.date.toString()} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                                        <div>
                                            <span className="font-medium">{format(holiday.date, 'PPP', { locale: ru })}</span>
                                            {holiday.description && <span className="text-gray-600 text-sm ml-2">- {holiday.description}</span>}
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(holiday.date)} disabled={deleteMutation.isPending} aria-label="Удалить выходной день"><Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" /></Button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-gray-500">В этом месяце выходные не назначены.</p>)}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Активные правила автоматизации</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Описание</TableHead>
                                <TableHead>Тип</TableHead>
                                <TableHead>Дата создания</TableHead>
                                <TableHead className="text-right">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingRules ? <TableRow><TableCell colSpan={4} className="text-center">Загрузка правил...</TableCell></TableRow> :
                                rules.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center">Нет активных правил.</TableCell></TableRow> :
                                    rules.map(rule => (
                                        <TableRow key={rule.id}>
                                            <TableCell>{rule.description}</TableCell>
                                            <TableCell><span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{rule.rule_type}</span></TableCell>
                                            <TableCell>{format(new Date(rule.created_at), 'dd.MM.yyyy HH:mm')}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)} disabled={deleteRuleMutation.isPending} aria-label="Удалить правило"><Trash2 className="h-4 w-4 text-red-500" aria-hidden="true" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!conflict} onOpenChange={() => setConflict(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Обнаружен конфликт</DialogTitle>
                        <DialogDescription>
                            Выбранная дата является датой начала или окончания для следующих резервов:
                            <strong className="block my-2">ID: {conflict?.conflicting_reservation_ids.join(', ')}</strong>
                            Назначение этого дня выходным сделает эти резервы некорректными. Вы уверены, что хотите продолжить?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConflict(null)}>Отмена</Button>
                        <Button variant="destructive" onClick={handleForceCreate} disabled={createMutation.isPending}>
                            {createMutation.isPending ? "Обработка..." : "Да, все равно назначить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!autoExtension} onOpenChange={() => setAutoExtension(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Автоматическое продление выполнено</DialogTitle>
                        <DialogDescription>
                            {autoExtension?.message}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {autoExtension?.extended_rentals && autoExtension.extended_rentals.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Продленные аренды:</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {autoExtension.extended_rentals.map(rental => (
                                        <div key={rental.id} className="text-sm bg-blue-50 p-2 rounded">
                                            <strong>Аренда #{rental.id}:</strong> {rental.old_end_date} → {rental.new_end_date}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {autoExtension?.extended_reservations && autoExtension.extended_reservations.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2">Продленные резервы:</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {autoExtension.extended_reservations.map(reservation => (
                                        <div key={reservation.id} className="text-sm bg-green-50 p-2 rounded">
                                            <strong>Резерв #{reservation.id}:</strong> {reservation.old_end_date} → {reservation.new_end_date}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                            <strong>Следующий рабочий день:</strong> {autoExtension?.next_working_day}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setAutoExtension(null)}>Понятно</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}