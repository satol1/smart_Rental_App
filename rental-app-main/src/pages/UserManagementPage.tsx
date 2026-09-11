// src/pages/UserManagementPage.tsx

import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/useProfile";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useQueryClient } from "@tanstack/react-query";
import UserTable from "@/components/admin/UserTable";
import { Button } from "@/components/ui/button";
import { Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserManagementPage() {
    const { data: currentUser } = useCurrentUser();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // Получаем данные пользователей с пагинацией
    const {
        data: usersData,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useAdminUsers();

    // Объединяем все страницы в один массив пользователей
    const allUsers = useMemo(() => {
        if (!usersData?.pages) return [];
        // Безопасно "разворачиваем" страницы в один массив
        const flatList = usersData.pages.flatMap(page => page.items || []);
        // Фильтруем массив, чтобы убрать любые невалидные записи
        return flatList.filter(item => item && item.id);
    }, [usersData]);

    const isAdmin = currentUser?.role === "admin";
    const isManager = currentUser?.role === "manager" || isAdmin;

    // Обработчик обновления пользователя
    const handleUserUpdated = () => {
        // Принудительно обновляем кэш пользователей
        void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    };

    // Если пользователь не имеет прав доступа
    if (!isManager) {
        return (
            <div>
                <div className="text-center">
                    <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        Доступ ограничен
                    </h1>
                    <p className="text-muted-foreground mb-4">
                        У вас нет прав для доступа к управлению пользователями.
                    </p>
                    <Button onClick={() => navigate("/")}>
                        На главную
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Заголовок страницы */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Управление пользователями
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {isAdmin
                                ? "Управление учетными записями, ролями и правами доступа"
                                : "Просмотр зарегистрированных пользователей системы"
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Основной контент */}
            <div className="bg-card rounded-lg border shadow-sm p-6">
                <UserTable 
                    users={allUsers}
                    isLoading={isLoading}
                    error={error}
                    onLoadMore={fetchNextPage}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onUserUpdated={handleUserUpdated}
                />
            </div>

            {/* Дополнительная информация для менеджеров */}
            {!isAdmin && (
                <div className="bg-warning-soft border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-warning mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-800 mb-1">
                                Ограниченный доступ
                            </p>
                            <p className="text-amber-700">
                                Как менеджер, вы можете просматривать список пользователей, но не можете:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-amber-700 space-y-1">
                                <li>Изменять роли пользователей</li>
                                <li>Блокировать или разблокировать пользователей</li>
                                <li>Удалять учетные записи</li>
                            </ul>
                            <p className="text-amber-700 mt-2">
                                Для выполнения этих действий обратитесь к администратору.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Информация о ролях */}
            <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3">Описание ролей пользователей</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-card p-3 rounded border">
                        <div className="font-medium text-foreground mb-2">👤 Пользователь</div>
                        <ul className="text-muted-foreground space-y-1">
                            <li>• Просмотр каталога оборудования</li>
                            <li>• Создание и управление своими резервами</li>
                            <li>• Редактирование собственного профиля</li>
                        </ul>
                    </div>
                    <div className="bg-card p-3 rounded border">
                        <div className="font-medium text-blue-900 mb-2">🛡️ Менеджер</div>
                        <ul className="text-muted-foreground space-y-1">
                            <li>• Все права пользователя</li>
                            <li>• Управление оборудованием</li>
                            <li>• Просмотр всех резервов</li>
                            <li>• Просмотр списка пользователей</li>
                        </ul>
                    </div>
                    <div className="bg-card p-3 rounded border">
                        <div className="font-medium text-red-900 mb-2">👑 Администратор</div>
                        <ul className="text-muted-foreground space-y-1">
                            <li>• Все права менеджера</li>
                            <li>• Управление пользователями</li>
                            <li>• Изменение ролей</li>
                            <li>• Блокировка и удаление пользователей</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}