// src/components/admin/dashboard/UserInfo.tsx

import { Phone, Wallet, Send } from "lucide-react";
import { useGetSettings } from '@/hooks/admin/useSettings';
import { toast } from 'sonner';
import { getBalanceColor } from "@/lib/balanceUtils";
import { StatusBadge } from "@/components/ui/status-badge";
import { MoneyText } from "@/components/ui/money-text";
import { mapLegacyUserStatus } from "@/constants/userStatusConstants";

interface UserInfoProps {
    userName: string;
    userPhone: string | null;
    user_telegram?: string | null;
    userStatus: string;
    userBalance: number;
    equipmentList: string[];
    scheduledTime: string;
    type: 'pickup' | 'return' | 'overdue';
}

export default function UserInfo({ userName, userPhone, user_telegram, userStatus, userBalance, equipmentList, scheduledTime, type }: UserInfoProps) {
    // Получаем настройки
    const { data: settings } = useGetSettings();
    
    // Цвет баланса
    const balanceColor = getBalanceColor(userBalance);

    // Маппинг статуса пользователя для обработки старых статусов
    const mappedUserStatus = mapLegacyUserStatus(userStatus);

    // Компонент Badge статуса пользователя
    const UserStatusBadge = () => {
        if (!mappedUserStatus) return null;

        return <StatusBadge status={mappedUserStatus} className="text-xs" />;
    };

    const handleTelegramClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем клик по всей карточке

        if (user_telegram) {
            // 1. Определяем ключ шаблона в зависимости от типа
            const templateKey = type === 'pickup' 
                ? 'TELEGRAM_PICKUP_TEMPLATE' 
                : 'TELEGRAM_RETURN_TEMPLATE';

            // 2. Ищем нужный шаблон в настройках
            const template = settings?.find(s => s.key === templateKey)?.value;

            // 3. УДАЛЕНА жестко прописанная переменная defaultMessage.
            // Если шаблон не найден, template будет undefined, и мы откроем Telegram с пустым сообщением.
            // Это правильное поведение, так как админ должен настроить шаблоны.
            let messageText = template || '';

            if (template) {
                // 4. Заменяем ВСЕ плейсхолдеры
                messageText = messageText
                    .replace(/{userName}/g, userName.split(' ')[1] || userName.split(' ')[0]) // Имя (второе слово) или фамилию если имя нет
                    .replace(/{userPhone}/g, userPhone || 'не указан')
                    .replace(/{equipmentList}/g, equipmentList.join('\n- ')) // Список с новой строки
                    .replace(/{date}/g, new Date(scheduledTime).toLocaleDateString('ru-RU'));
            }

            const cleanUsername = user_telegram.startsWith('@') ? user_telegram.substring(1) : user_telegram;
            const message = encodeURIComponent(messageText);
            window.open(`https://t.me/${cleanUsername}?text=${message}`, '_blank');
        } else {
            toast.error("У этого пользователя не указан Telegram.");
        }
    };

    return (
        <div className="space-y-1 flex-1 min-w-0">
            <h4 className="font-bold text-base truncate flex items-center flex-wrap gap-2">
                <a 
                    href={`/admin/users?search=${encodeURIComponent(userName)}`}
                    className="hover:underline"
                >
                    {userName}
                </a>
                <UserStatusBadge />
            </h4>
            {userPhone && (
                <a 
                    href={`tel:${userPhone}`} 
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                    <Phone className="w-3 h-3" />
                    {userPhone}
                </a>
            )}
            {user_telegram && (
                <button
                    onClick={handleTelegramClick}
                    className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                    <Send className="w-3 h-3" />
                    {user_telegram}
                </button>
            )}
            <div className="text-xs flex items-center gap-3">
                <span className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Баланс: <span className={balanceColor}><MoneyText value={userBalance} /></span>
                </span>
            </div>
        </div>
    );
}
