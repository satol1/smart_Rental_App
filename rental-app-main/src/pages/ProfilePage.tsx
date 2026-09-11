// src/pages/ProfilePage.tsx

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useNavigate, useLocation } from "react-router-dom"
import { useProfileUpdate, useCurrentUser } from "@/hooks/useProfile"
import { useAuthStore } from "@/store/authStore"
import { toast } from "sonner"
import { PhoneInput } from "@/components/ui/phone-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { adminUserUpdateSchema, type AdminUserUpdateSchema } from "@/lib/validationSchemas"
// ✅ 1. Импортируем наш новый компонент для отображения истории
import BalanceHistoryTable from "@/components/profile/BalanceHistoryTable";
import { SkeletonList } from "@/components/ui/skeleton-list";

export default function ProfilePage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { logout } = useAuthStore()
    const queryClient = useQueryClient()

    const backTo = location.state?.from || "/"

    const { data: user, isLoading } = useCurrentUser()
    const updateProfile = useProfileUpdate()

    const [, setEmailChanged] = useState(false)
    const [originalEmail, setOriginalEmail] = useState("")
    const [showEmailWarning, setShowEmailWarning] = useState(false)

    const form = useForm<AdminUserUpdateSchema>({
        resolver: zodResolver(adminUserUpdateSchema),
        mode: "onChange",
        defaultValues: {
            full_name: "",
            email: "",
            phone: "",
            telegram_username: "",
        }
    })

    const { register, handleSubmit, formState: { errors, isValid, isDirty }, reset, watch, control } = form

    useEffect(() => {
        if (user) {
            const formData = {
                full_name: user.full_name,
                email: user.email,
                phone: user.phone || "",
                telegram_username: user.telegram_username || "",
            }
            reset(formData)
            setOriginalEmail(user.email)
            
            // Инвалидируем кэш истории баланса при загрузке страницы профиля
            queryClient.invalidateQueries({
                queryKey: ["balanceHistory", "me"]
            });
        }
    }, [user, queryClient, reset])

    // Отслеживаем изменения email
    const watchedEmail = watch("email")
    useEffect(() => {
        if (originalEmail && watchedEmail !== originalEmail) {
            setEmailChanged(true)
            setShowEmailWarning(true)
        } else {
            setEmailChanged(false)
            setShowEmailWarning(false)
        }
    }, [watchedEmail, originalEmail])

    const onSubmit = async (data: AdminUserUpdateSchema) => {
        try {
            // Проверяем, изменился ли email
            const emailChanged = user && data.email !== user.email;

            // Подготавливаем данные для отправки
            const updateData: {
                full_name: string;
                email: string;
                phone?: string | null;
                telegram_username?: string | null;
            } = {
                full_name: data.full_name ?? "",
                email: data.email ?? "",
                phone: data.phone || null
            };
            
            // Добавляем telegram_username только если он не пустой
            if (data.telegram_username?.trim()) {
                updateData.telegram_username = data.telegram_username.trim();
            } else {
                updateData.telegram_username = null;
            }

            await updateProfile.mutateAsync(updateData)
            toast.success("Профиль успешно обновлён")

            // Показываем уведомление-заглушку, если email был изменен
            if (emailChanged) {
                toast.info("На вашу новую почту отправлена ссылка для подтверждения (функционал в разработке).")
            }

        } catch (err) {
            console.error(err)
            toast.error("Ошибка при обновлении профиля")
        }
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8" role="status" aria-label="Загрузка профиля">
                <SkeletonList count={1} columns="single" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="text-center mt-12">
                <p className="text-lg">Вы не авторизованы.</p>
                <Button className="mt-4" onClick={() => navigate("/")}>
                    На главную
                </Button>
            </div>
        )
    }

    return (
        // ✅ 2. Увеличиваем максимальную ширину контейнера, чтобы таблица поместилась
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
                <h1 className="text-xl font-bold text-center">Редактировать профиль</h1>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="fullName">ФИО</Label>
                        <Input
                            id="fullName"
                            type="text"
                            {...register("full_name")}
                        />
                        {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            {...register("email")}
                        />
                        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                    </div>

                    {/* +++ НАЧАЛО: Новое поле для телефона +++ */}
                    <div>
                        <Label htmlFor="phone">Телефон</Label>
                        <Controller
                            name="phone"
                            control={control}
                            render={({ field }) => (
                                <PhoneInput
                                    id="phone"
                                    {...field}
                                    placeholder="+7 (___) ___-__-__"
                                />
                            )}
                        />
                        {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
                    </div>
                    {/* +++ КОНЕЦ: Новое поле для телефона +++ */}

                    {/* +++ НАЧАЛО: Новое поле для Telegram +++ */}
                    <div>
                        <Label htmlFor="telegram">Telegram</Label>
                        <Input
                            id="telegram"
                            type="text"
                            {...register("telegram_username")}
                            placeholder="@username или username"
                        />
                        {errors.telegram_username && <p className="text-xs text-red-600 mt-1">{errors.telegram_username.message}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                            Введите ваш Telegram username (без @ или с @)
                        </p>
                    </div>
                    {/* +++ КОНЕЦ: Новое поле для Telegram +++ */}

                    {showEmailWarning && (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                После изменения email потребуется подтверждение нового адреса.
                                На указанную почту будет отправлена ссылка для подтверждения.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-between items-center pt-2">
                        <Button type="submit" disabled={!isDirty || !isValid || updateProfile.isPending}>
                            {updateProfile.isPending ? "Сохранение..." : "Сохранить"}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => navigate(backTo)}>
                            Назад
                        </Button>
                    </div>
                </form>

                <div className="pt-4 border-t text-center space-y-2">
                    <p className="text-xs text-gray-500">
                        Для изменения пароля обратитесь к администратору.
                    </p>
                    <Button
                        variant="link"
                        className="text-red-600"
                        onClick={() => {
                            logout()
                            navigate("/")
                        }}
                    >
                        Выйти из аккаунта
                    </Button>
                </div>
            </div>

            {/* ✅ 3. Добавляем новый блок с историей баланса */}
            <div className="bg-white border rounded-lg shadow-sm p-6 space-y-4">
                <h2 className="text-xl font-bold">История баланса</h2>
                <BalanceHistoryTable userId={user.id} />
            </div>
        </div>
    )
}