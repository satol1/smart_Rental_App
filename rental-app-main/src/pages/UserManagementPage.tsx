// src/pages/UserManagementPage.tsx

import { useMemo } from "react";
import { useCurrentUser } from "@/hooks/useProfile";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useQueryClient } from "@tanstack/react-query";
import AdminNavigation from "@/components/admin/AdminNavigation";
import UserTable from "@/components/admin/UserTable";
import { Button } from "@/components/ui/button";
import { Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { UserOut } from "@/types/user";

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
    const handleUserUpdated = (_updatedUser: UserOut) => {
        // Принудительно обновляем кэш пользователей
        void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    };

    // Если пользователь не имеет прав доступа
    if (!isManager) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Доступ ограничен
                    </h1>
                    <p className="text-gray-600 mb-4">
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
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
            <AdminNavigation />

            {/* Заголовок страницы */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Управление пользователями
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {isAdmin
                                ? "Управление учетными записями, ролями и правами доступа"
                                : "Просмотр зарегистрированных пользователей системы"
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Основной контент */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
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
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
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
            <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Описание ролей пользователей</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-3 rounded border">
                        <div className="font-medium text-gray-900 mb-2">👤 Пользователь</div>
                        <ul className="text-gray-600 space-y-1">
                            <li>• Просмотр каталога оборудования</li>
                            <li>• Создание и управление своими резервами</li>
                            <li>• Редактирование собственного профиля</li>
                        </ul>
                    </div>
                    <div className="bg-white p-3 rounded border">
                        <div className="font-medium text-blue-900 mb-2">🛡️ Менеджер</div>
                        <ul className="text-gray-600 space-y-1">
                            <li>• Все права пользователя</li>
                            <li>• Управление оборудованием</li>
                            <li>• Просмотр всех резервов</li>
                            <li>• Просмотр списка пользователей</li>
                        </ul>
                    </div>
                    <div className="bg-white p-3 rounded border">
                        <div className="font-medium text-red-900 mb-2">👑 Администратор</div>
                        <ul className="text-gray-600 space-y-1">
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