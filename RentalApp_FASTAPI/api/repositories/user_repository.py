# api/repositories/user_repository.py

from typing import Optional, Tuple, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status
from api.repositories.base_repository import BaseRepository
from api.models.user import User
from shared.schemas.user_schema import UserCreate, UserUpdate, AdminUserUpdate
from api.utils.password_utils import hash_password


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """
    Репозиторий для работы с пользователями.
    
    Наследует базовые CRUD операции от BaseRepository и добавляет
    специфичные методы для работы с пользователями.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Инициализация репозитория пользователей.
        
        Args:
            db: Асинхронная сессия базы данных
        """
        super().__init__(db, User)
    
    async def create(self, data: UserCreate) -> User:
        """
        Создание нового пользователя с хешированием пароля.
        
        Args:
            data: Pydantic схема UserCreate с данными для создания
            
        Returns:
            Созданный объект User
        """
        # Преобразуем Pydantic схему в словарь, исключая None значения
        obj_data = data.model_dump(exclude_unset=True)
        
        # Хешируем пароль
        if 'password' in obj_data:
            obj_data['hashed_password'] = hash_password(obj_data.pop('password'))
        
        # Создаем экземпляр модели
        db_obj = self.model(**obj_data)
        
        # Добавляем в сессию
        self.db.add(db_obj)
        await self.db.flush()  # Получаем ID без коммита
        await self.db.refresh(db_obj)  # Обновляем объект из БД
        
        return db_obj
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Получение пользователя по адресу электронной почты.
        
        Args:
            email: Email пользователя
            
        Returns:
            Объект User или None, если пользователь не найден
        """
        result = await self.db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def get_by_telegram_username(self, telegram_username: str) -> Optional[User]:
        """
        Получение пользователя по имени в Telegram.
        
        Args:
            telegram_username: Telegram username пользователя
            
        Returns:
            Объект User или None, если пользователь не найден
        """
        result = await self.db.execute(
            select(User).where(User.telegram_username == telegram_username)
        )
        return result.scalar_one_or_none()
    
    async def get_all_paginated(self, skip: int, limit: int) -> Tuple[List[User], int]:
        """
        Получение списка всех пользователей с пагинацией для админ-панели.
        
        Args:
            skip: Количество записей для пропуска (offset)
            limit: Максимальное количество записей для возврата
            
        Returns:
            Кортеж из списка пользователей и их общего количества
        """
        # Получаем общее количество пользователей
        count_result = await self.db.execute(
            select(func.count(User.id))
        )
        total_count = count_result.scalar()
        
        # Получаем пользователей с пагинацией
        users_result = await self.db.execute(
            select(User)
            .offset(skip)
            .limit(limit)
            .order_by(User.created_at.desc())
        )
        users = users_result.scalars().all()
        
        return list(users), total_count
    
    async def update_admin(self, db_obj: User, update_data: AdminUserUpdate) -> User:
        """
        Специальный метод обновления для администратора.
        Позволяет изменять расширенный набор полей (роль, баланс, статус и т.д.).
        
        Args:
            db_obj: Существующий объект User
            update_data: Схема AdminUserUpdate с данными для обновления
            
        Returns:
            Обновленный объект User
        """
        # Преобразуем Pydantic схему в словарь, исключая None значения
        update_dict = update_data.model_dump(exclude_unset=True)
        
        # Обновляем поля объекта
        for field, value in update_dict.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        # Добавляем в сессию для отслеживания изменений
        self.db.add(db_obj)
        await self.db.flush()  # Применяем изменения без коммита
        await self.db.refresh(db_obj)  # Обновляем объект из БД
        
        return db_obj
    
    async def get_user_by_id_or_fail(self, user_id: int) -> User:
        """
        Получение пользователя по ID или выброс исключения.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Объект User
            
        Raises:
            HTTPException: Если пользователь не найден
        """
        user = await self.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"User with ID {user_id} not found."
            )
        return user
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Получение пользователя по email (алиас для get_by_email).
        
        Args:
            email: Email пользователя
            
        Returns:
            Объект User или None, если пользователь не найден
        """
        return await self.get_by_email(email)
    
    async def get_active_users(self, exclude_statuses: Optional[List[str]] = None) -> List[User]:
        """
        Получает активных пользователей, исключая указанные статусы.
        
        Используется для оптимизации запросов, например, при проверке просроченных резервов.
        
        Args:
            exclude_statuses: Список статусов для исключения (например, ["Заблокирован", "Персона НонГрата"])
            
        Returns:
            Список активных пользователей
        """
        query = select(User)
        
        if exclude_statuses:
            query = query.where(~User.status.in_(exclude_statuses))
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def update_balance(self, user_id: int, new_balance: float) -> User:
        """
        Обновление баланса пользователя.
        
        Args:
            user_id: ID пользователя
            new_balance: Новый баланс
            
        Returns:
            Обновленный объект User
            
        Raises:
            HTTPException: Если пользователь не найден
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"REPO: Начало обновления баланса пользователя {user_id} на {new_balance}")
        
        user = await self.get_by_id(user_id)
        if not user:
            logger.error(f"REPO: Пользователь {user_id} не найден")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )
        
        logger.info(f"REPO: Пользователь {user_id} найден, текущий баланс: {user.balance}")
        
        user.balance = new_balance
        logger.info(f"REPO: Установлен новый баланс: {new_balance}")
        
        self.db.add(user)
        logger.info(f"REPO: Пользователь добавлен в сессию")
        
        await self.db.flush()
        logger.info(f"REPO: Flush выполнен успешно")
        
        await self.db.refresh(user)
        logger.info(f"REPO: Refresh выполнен успешно")
        
        logger.info(f"REPO: Обновление баланса пользователя {user_id} завершено успешно")
        return user
    
    async def get_by_id_for_update(self, user_id: int) -> Optional[User]:
        """
        Получение пользователя по ID с блокировкой на уровне строки для обновления.
        Используется для предотвращения race conditions при обновлении баланса.
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Объект User или None, если пользователь не найден
        """
        result = await self.db.execute(
            select(User).filter(User.id == user_id).with_for_update(skip_locked=True)
        )
        return result.scalars().first()
    
    async def delete(self, user: User) -> None:
        """
        Удаление пользователя.
        
        Args:
            user: Объект пользователя для удаления
        """
        await self.db.delete(user)
        await self.db.flush()
    
    async def get_user_active_reservations_count(self, user_id: int) -> int:
        """
        Получает количество активных резервов пользователя.
        
        Активный резерв определяется как:
        - Резерв со статусом ACTIVE
        - end_date >= сегодня (дата окончания еще не наступила)
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Количество активных резервов
        """
        from api.models.reservation import Reservation
        from shared.constants.order_status import OrderStatus
        from datetime import date
        
        result = await self.db.execute(
            select(func.count(Reservation.id)).filter(
                Reservation.user_id == user_id,
                Reservation.status == OrderStatus.ACTIVE,
                Reservation.end_date >= date.today()
            )
        )
        return result.scalar() or 0
    
    async def get_user_overdue_reservations_count(self, user_id: int) -> int:
        """
        Получает количество просроченных резервов пользователя.
        
        Просроченный резерв определяется как:
        - Резерв со статусом ACTIVE
        - start_date < сегодня (дата начала уже прошла)
        - rental is None (не был преобразован в аренду)
        
        ВАЖНО: Этот метод дублирует логику из ReservationRepository.
        Для подсчета просроченных резервов лучше использовать ReservationRepository.count_overdue_reservations_by_user()
        
        Args:
            user_id: ID пользователя
            
        Returns:
            Количество просроченных резервов
        """
        # Этот метод оставлен для обратной совместимости
        # В будущем лучше использовать ReservationRepository напрямую
        from api.models.reservation import Reservation
        from api.models.rental import Rental
        from shared.constants.order_status import OrderStatus
        from datetime import date
        from sqlalchemy import not_
        
        today = date.today()
        
        # Используем NOT EXISTS для проверки отсутствия rental
        subquery = select(1).where(
            Rental.reservation_id == Reservation.id
        ).exists()
        
        result = await self.db.execute(
            select(func.count(Reservation.id)).filter(
                and_(
                    Reservation.user_id == user_id,
                    Reservation.status == OrderStatus.ACTIVE,
                    Reservation.start_date < today,
                    not_(subquery)  # rental не существует
                )
            )
        )
        return result.scalar() or 0
    
    async def update_user_status(self, user: User, new_status: 'UserStatus', manually: bool = False) -> User:
        """
        Обновляет статус пользователя.
        
        Args:
            user: Объект пользователя
            new_status: Новый статус (UserStatus enum)
            manually: True, если статус изменяется вручную (админом/менеджером), False - автоматически
            
        Returns:
            Обновленный объект User
        """
        from shared.constants.user_status import UserStatus
        
        user.status = new_status.value if isinstance(new_status, UserStatus) else str(new_status)
        # Устанавливаем флаг ручного изменения статуса
        if manually:
            user.status_changed_manually = True
        # Если статус изменяется автоматически, флаг status_changed_manually не меняется
        # (остается текущее значение)
        
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user