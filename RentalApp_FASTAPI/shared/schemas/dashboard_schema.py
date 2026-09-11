# shared/schemas/dashboard_schema.py
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime, date
from typing import List, Optional

# Элемент для виджета "Сегодня в фокусе"
class TodayFocusItem(BaseModel):
    id: int  # Изменено с order_id для консистентности с фронтендом
    user_name: str
    user_phone: Optional[str] = None
    user_telegram: Optional[str] = None
    user_status: str
    user_balance: float
    equipment_list: List[str]
    user_id: int
    order_type: str # 'reservation' или 'rental'
    scheduled_time: datetime  # Время выдачи или возврата
    start_date: Optional[date] = None  # Дата начала резерва
    # Поля для просроченных аренд
    due_date: Optional[date] = None  # Дата окончания аренды
    days_overdue: Optional[int] = None  # Количество дней просрочки
    # Статус клиента
    user_client_status: Optional[str] = None  # 'new', 'vip', 'debtor' или null
    # Флаг для просроченных выдач
    is_pending_pickup: bool = False  # True если дата начала резерва была до сегодняшнего дня

# Элемент для виджета "Последние события"
class ActivityFeedItem(BaseModel):
    id: int  # Добавлено для консистентности с фронтендом
    timestamp: datetime
    # Фронтенд читает поле `type`; сериализуем под него, оставляя
    # activity_type как alias для конструирования из репозитория
    activity_type: str = Field(alias="activity_type", serialization_alias="type")
    description: str
    user_name: Optional[str] = None  # Имя пользователя для обогащения ленты событий
    equipment_name: Optional[str] = None  # Название оборудования для обогащения ленты событий

# Элемент для графика "Популярное оборудование"
class PopularEquipmentItem(BaseModel):
    equipment_id: int  # ID оборудования для использования в качестве key на фронтенде
    equipment_name: str
    rental_count: int  # Количество аренд
    revenue: float  # Выручка от аренды данного оборудования

# Вложенная модель для всех KPI показателей
class KpiData(BaseModel):
    # --- Существующие поля (остаются без изменений) ---
    total_users: int  # Общее количество пользователей
    active_users: int  # Активные пользователи
    total_equipment: int  # Общее количество оборудования
    total_reservations: int  # Общее количество резерваций
    revenue_today: float  # Доход за сегодня
    revenue_this_month: float  # Доход за текущий месяц
    occupancy_rate: float  # Коэффициент загруженности
    avg_rental_duration: float  # Средняя продолжительность аренды
    
    # +++ НОВЫЕ ПОЛЯ +++
    active_reservations: int  # Всего активных резервов
    total_rentals: int  # Всего аренд
    active_rentals: int  # Активных аренд
    overdue_rentals: int  # Просроченных аренд
    total_accessories: int  # Всего аксессуаров
    total_associations: int  # Всего ассоциаций

# Основная схема ответа
class DashboardSummaryResponse(BaseModel):
    # Виджет "Сегодня в фокусе"
    pickups_today: List[TodayFocusItem]
    returns_today: List[TodayFocusItem]
    overdue_rentals: List[TodayFocusItem]

    # Виджет "Ключевые показатели" - теперь вложенная структура
    kpi: KpiData

    # Виджет "Последние события"
    recent_activity: List[ActivityFeedItem]

    # Виджет "Популярное оборудование"
    popular_equipment: List[PopularEquipmentItem]

    model_config = ConfigDict(from_attributes=True)
