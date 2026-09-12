// src/pages/admin/SettingsPage.tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useGetSettings, useUpdateSettings } from '@/hooks/admin/useSettings';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Info } from "lucide-react";

const TELEGRAM_PICKUP_KEY = 'TELEGRAM_PICKUP_TEMPLATE';
const TELEGRAM_RETURN_KEY = 'TELEGRAM_RETURN_TEMPLATE';

type SettingsFormData = {
    [TELEGRAM_PICKUP_KEY]: string;
    [TELEGRAM_RETURN_KEY]: string;
};

export default function SettingsPage() {
    const { data: settings, isLoading } = useGetSettings();
    const updateMutation = useUpdateSettings();

    const { register, handleSubmit, reset, formState: { isDirty } } = useForm<SettingsFormData>();

    useEffect(() => {
        if (settings) {
            const defaultPickupMessage = 'Здравствуйте, {userName}! Напоминаем о вашей аренде, которая начинается сегодня. Список оборудования:\n- {equipmentList}';
            const defaultReturnMessage = 'Здравствуйте, {userName}! Напоминаем, что сегодня необходимо вернуть оборудование. Список:\n- {equipmentList}';

            const pickupTemplate = settings.find(s => s.key === TELEGRAM_PICKUP_KEY)?.value || defaultPickupMessage;
            const returnTemplate = settings.find(s => s.key === TELEGRAM_RETURN_KEY)?.value || defaultReturnMessage;
            reset({
                [TELEGRAM_PICKUP_KEY]: pickupTemplate,
                [TELEGRAM_RETURN_KEY]: returnTemplate,
            });
        }
    }, [settings, reset]);

    const onSubmit = (data: SettingsFormData) => {
        const payload = Object.entries(data).map(([key, value]) => ({ key, value }));
        updateMutation.mutate(payload);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                 <Skeleton className="h-12 w-1/2" />
                 <Skeleton className="h-64 w-full" />
                 <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                 <Settings className="w-8 h-8 text-foreground" />
                 <div>
                    <h1 className="text-3xl font-bold text-foreground">Настройки приложения</h1>
                    <p className="text-muted-foreground mt-1">Управление шаблонами и другими параметрами системы.</p>
                 </div>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Шаблоны сообщений Telegram</CardTitle>
                        <CardDescription>Настройте тексты сообщений, отправляемых из виджета "Фокус на сегодня".</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor={TELEGRAM_PICKUP_KEY}>Шаблон для сообщения о ВЫДАЧЕ</Label>
                            <Textarea id={TELEGRAM_PICKUP_KEY} {...register(TELEGRAM_PICKUP_KEY)} rows={4} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={TELEGRAM_RETURN_KEY}>Шаблон для сообщения о ВОЗВРАТЕ</Label>
                            <Textarea id={TELEGRAM_RETURN_KEY} {...register(TELEGRAM_RETURN_KEY)} rows={4} />
                        </div>
                         <div className="flex justify-end">
                            <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
                                {updateMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>

             <Card className="bg-info-soft border-primary/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-foreground"><Info className="w-4 h-4"/>Справка по плейсхолдерам</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p>Используйте эти переменные в шаблонах. Они будут автоматически заменены на реальные данные:</p>
                    <p><code>{'{userName}'}</code> - Имя клиента (второе слово в ФИО, например, "Иван").</p>
                    <p><code>{'{userPhone}'}</code> - Телефон клиента.</p>
                    <p><code>{'{equipmentList}'}</code> - Список оборудования (каждый пункт с новой строки).</p>
                    <p><code>{'{date}'}</code> - Дата выдачи или возврата (в формате ДД.ММ.ГГГГ).</p>
                </CardContent>
            </Card>
        </div>
    );
}
