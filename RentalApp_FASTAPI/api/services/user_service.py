# api/services/user_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from api.models.user import User
from api.models.payment import Payment
from api.models.balance_history import BalanceHistory
from api.services.balance_service import BalanceService
from api.repositories.user_repository import UserRepository
from api.repositories.balance_history_repository import BalanceHistoryRepository
from shared.constants.balance_operations import BalanceOperationType
from shared.schemas.user_schema import UserUpdate, UserOut, AdminUserCreate, AdminUserUpdate, UserPaymentRequest
from api.utils.password_utils import hash_password, verify_password
from fastapi import HTTPException, status
import logging
from datetime import datetime
from typing import List, Tuple


class UserService:
    """
    Сервис для управления пользователями.
    Инкапсулирует всю бизнес-логику работы с пользователями.
    """
    
    def __init__(
        self, 
        db: AsyncSession,
        user_repo: UserRepository,
        balance_service: BalanceService,
        balance_history_repo: BalanceHistoryRepository,
        payment_repo,
        order_validator=None,
        user_status_service=None
    ):
        self.db = db
        self.user_repo = user_repo
        self.balance_service = balance_service
        self.balance_history_repo = balance_history_repo
        self.payment_repo = payment_repo
        self.order_validator = order_validator
        self.user_status_service = user_status_service


    async def create_admin_user(self, user_data: AdminUserCreate) -> User:
        """Создает пользователя (для админов)."""
        # Проверяем уникальность email
        existing_user = await self.user_repo.get_by_email(user_data.email)
        if self.order_validator:
            self.order_validator.validate_user_email_unique(existing_user, user_data.email)

        try:
            # Определяем статус: для админов и менеджеров - VIP, для обычных пользователей - Новый
            user_status = "VIP" if user_data.role in ["admin", "manager"] else "Новый"
            
            # Создаем пользователя через репозиторий
            new_user = User(
                full_name=user_data.full_name,
                email=user_data.email,
                hashed_password=hash_password(user_data.password),
                phone=user_data.phone,
                telegram_username=user_data.telegram_username,
                role=user_data.role,
                is_active=True,
                status=user_status,
                balance=0.0,
                notes=f"Создан администратором {datetime.now().strftime('%d-%m-%Y')}",
                privacy_policy_accepted=user_data.privacy_policy_accepted,
                terms_accepted=user_data.terms_accepted,
                email_verified=True
            )
            self.db.add(new_user)
            await self.db.flush()  # Получаем ID без коммита
            await self.db.refresh(new_user)
            # Транзакция коммитится middleware
            # Возвращаем созданный объект с загруженными данными из БД
            return new_user
        except Exception as e:
            # Явный rollback больше не нужен. Он выполнился автоматически при выходе из блока `with` с ошибкой.
            logging.error(f"Ошибка при создании пользователя администратором: {e}")
            raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера.")

    def get_current_user_info(self, user: User) -> UserOut:
        return UserOut.model_validate(user)

    async def update_user(self, user: User, data: UserUpdate) -> UserOut:
        """Обновляет профиль текущего пользователя."""
        update_data = data.model_dump(exclude_unset=True)

        if 'email' in update_data and update_data['email'] != user.email:
            logging.info(f"Пользователь {user.id} запросил смену email на {update_data['email']}. Требуется подтверждение.")
            del update_data['email']

        # Обновляем данные пользователя
        for key, value in update_data.items():
            setattr(user, key, value)
        self.db.add(user)
        # Транзакция коммитится middleware
        # Возвращаем обновленный объект без повторного запроса к БД
        return UserOut.model_validate(user)

    async def update_user_by_admin(self, user_id: int, data: AdminUserUpdate, current_user: User) -> UserOut:
        """Обновляет данные пользователя. Только админ может менять роль."""
        # Получаем пользователя через репозиторий
        user_to_update = await self.user_repo.get_by_id(user_id)
        if not user_to_update:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        update_data = data.model_dump(exclude_unset=True)

        if 'role' in update_data and current_user.role != 'admin':
            raise HTTPException(status_code=403, detail="Только администратор может изменять роль.")

        # Проверка прав на изменение статуса "Персона НонГрата"
        status_changed_manually = False
        if 'status' in update_data:
            from shared.constants.user_status import UserStatus
            
            try:
                target_status = UserStatus(update_data['status'])
                
                # Проверяем права через UserStatusService, если он доступен
                if self.user_status_service:
                    can_change = await self.user_status_service.can_manager_change_status(current_user, target_status)
                    if not can_change:
                        raise HTTPException(
                            status_code=403, 
                            detail="Только администратор может устанавливать статус 'Персона НонГрата'."
                        )
                else:
                    # Fallback: проверка напрямую
                    if target_status == UserStatus.PERSONA_NON_GRATA and current_user.role != 'admin':
                        raise HTTPException(
                            status_code=403, 
                            detail="Только администратор может устанавливать статус 'Персона НонГрата'."
                        )
                
                # Если статус присутствует в запросе, это ручное изменение (даже если значение не изменилось)
                # Это важно для того, чтобы автоматическое обновление не перезаписало ручное изменение
                status_changed_manually = True
                
            except ValueError:
                # Если статус не из enum, пропускаем проверку (для обратной совместимости)
                pass

        # Используем метод репозитория для обновления
        updated_user = await self.user_repo.update_admin(user_to_update, data)
        
        # Если статус был изменен вручно, устанавливаем флаг status_changed_manually
        if status_changed_manually:
            updated_user.status_changed_manually = True
            self.db.add(updated_user)
            await self.db.flush()
        
        # Коммитим транзакцию
        # Транзакция коммитится middleware
        # Обновляем объект из базы данных после коммита
        await self.db.refresh(updated_user)
        return UserOut.model_validate(updated_user)

    async def process_user_payment(self, user_id: int, payment_data: UserPaymentRequest, manager: User) -> UserOut:
        """Обрабатывает реальный платеж и пополняет внутренний баланс пользователя."""
        
        try:
            from api.services.order.order_validator import OrderValidator
            
            # Получаем пользователя через UserRepository
            user_to_update = await self.user_repo.get_by_id(user_id)
            if not user_to_update:
                raise HTTPException(status_code=404, detail="Пользователь не найден")
            if self.order_validator:
                self.order_validator.validate_payment_amount(payment_data.amount)

            payment_data_dict = {
                "user_id": user_id,
                "amount": payment_data.amount,
                "payment_method": getattr(payment_data, 'payment_method', 'manual'),
                "description": payment_data.description or f"Платеж принят {manager.full_name}",
                "transaction_type": "balance_top_up"
            }
            new_payment = await self.payment_repo.create_payment(payment_data_dict)

            await self.balance_service.add_transaction(
                user_id=user_id,
                amount=payment_data.amount,
                operation_type=BalanceOperationType.BALANCE_TOP_UP,
                description=f"Пополнение баланса. Метод: {payment_data.payment_method}."
            )
            
            # Коммитим транзакцию
            # Транзакция коммитится middleware
            # Обновляем объект пользователя после успешной транзакции
            await self.db.refresh(user_to_update)
            return UserOut.model_validate(user_to_update)

        except HTTPException:
            # Пробрасываем HTTP исключения без дополнительной обработки
            raise
        except Exception as e:
            # Логируем и возвращаем общую ошибку сервера
            logging.error(f"Ошибка при обработке платежа для пользователя ID={user_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Внутренняя ошибка при обработке платежа.")

    async def get_balance_history_for_user(self, user_id: int, skip: int, limit: int) -> Tuple[List[BalanceHistory], int]:
        """Получает пагинированную историю баланса для указанного пользователя."""
        return await self.payment_repo.get_balance_history_for_user(user_id, skip, limit)

    async def adjust_user_balance(self, user_id: int, amount: float, description: str, current_user: User) -> UserOut:
        """Выполняет ручную корректировку баланса пользователя (начисление бонусов, списание штрафов и т.д.)."""
        
        try:
            async with self.db.begin_nested():
                # Проверяем существование пользователя через UserRepository
                user_to_adjust = await self.user_repo.get_user_by_id_or_fail(user_id)
                if self.order_validator:
                    self.order_validator.validate_balance_adjustment(amount, description)

                # Определяем тип операции на основе знака суммы
                operation_type = BalanceOperationType.MANUAL_CREDIT if amount > 0 else BalanceOperationType.MANUAL_DEBIT
                
                # Создаем транзакцию через BalanceService
                await self.balance_service.add_transaction(
                    user_id=user_id,
                    amount=amount,
                    operation_type=operation_type,
                    description=f"{description} (оператор: {current_user.full_name})"
                )
            
            # Явно коммитим транзакцию
            # Транзакция коммитится middleware
            # Обновляем объект пользователя после успешной транзакции
            await self.db.refresh(user_to_adjust)
            return UserOut.model_validate(user_to_adjust)

        except HTTPException:
            # Пробрасываем HTTP исключения без дополнительной обработки
            raise
        except Exception as e:
            # Логируем и возвращаем общую ошибку сервера
            logging.error(f"Ошибка при корректировке баланса для пользователя ID={user_id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Внутренняя ошибка при корректировке баланса.")


    async def block_user(self, user_id: int, current_user: User) -> dict:
        """Блокирует пользователя (устанавливает is_active = False)."""
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Нельзя заблокировать самого себя.")

        user_orm = await self.user_repo.get_by_id(user_id)
        if not user_orm:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        user_orm.is_active = False
        # Транзакция коммитится middleware
        return {"message": f"Пользователь {user_orm.email} заблокирован"}

    async def unblock_user(self, user_id: int) -> dict:
        """Разблокирует пользователя (устанавливает is_active = True)."""
        user_orm = await self.user_repo.get_by_id(user_id)
        if not user_orm:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        user_orm.is_active = True
        # Транзакция коммитится middleware
        return {"message": f"Пользователь {user_orm.email} разблокирован"}

    async def delete_user(self, user_id: int, current_user: User) -> dict:
        """Полностью удаляет пользователя из системы."""
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Нельзя удалить самого себя.")

        user_to_delete = await self.user_repo.get_by_id(user_id)
        if not user_to_delete:
            raise HTTPException(status_code=404, detail="Пользователь не найден")

        email = user_to_delete.email
        await self.user_repo.delete(user_to_delete)
        # Транзакция коммитится middleware  # Транзакция коммитится здесь
        logging.info(f"Admin {current_user.email} deleted user {email} (ID: {user_id})")
        return {"message": f"Пользователь {email} полностью удален из системы"}

    async def delete_balance_history_entry(self, history_id: int):
        """
        Удаляет запись из истории баланса и атомарно пересчитывает баланс пользователя.
        Транзакция управляется middleware, поэтому не используем commit/rollback здесь.
        """
        try:
            # 1. Найти запись в истории
            history_entry = await self.balance_history_repo.get_by_id(history_id)
            if not history_entry:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запись в истории баланса не найдена.")

            user_id = history_entry.user_id

            # 2. Удалить запись из истории
            await self.balance_history_repo.db.delete(history_entry)
            
            # Принудительно отправляем изменения в БД, чтобы запись была удалена
            await self.db.flush()
            
            # 3. Пересчитать итоговый баланс пользователя
            new_balance = await self.balance_history_repo.get_user_balance_sum(user_id)

            # 4. Обновить баланс в модели User
            user_to_update = await self.user_repo.get_by_id(user_id)
            if not user_to_update:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Пользователь с ID {user_id} для обновления баланса не найден.")
            
            user_to_update.balance = new_balance
            self.db.add(user_to_update)
            
            # НЕ коммитим транзакцию - это делает middleware
            logging.info(f"Запись истории баланса #{history_id} удалена. Баланс пользователя #{user_id} пересчитан.")

        except Exception as e:
            # НЕ откатываем транзакцию - это делает middleware
            logging.error(f"Ошибка при удалении записи истории баланса #{history_id}: {e}", exc_info=True)
            # Пробрасываем исключение, чтобы FastAPI вернул корректный HTTP-статус
            if not isinstance(e, HTTPException):
                 raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Внутренняя ошибка сервера при удалении записи.")
            raise e

    async def change_password(self, user_id: int, current_password: str, new_password: str) -> None:
        """Изменяет пароль пользователя."""
        # Получаем пользователя
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Проверяем текущий пароль
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Неверный текущий пароль")
        
        # Хешируем новый пароль
        new_hashed_password = hash_password(new_password)
        
        # Обновляем пароль
        user.hashed_password = new_hashed_password
        self.db.add(user)
        # Транзакция коммитится middleware
        
        logging.info(f"Пароль пользователя {user_id} успешно изменен")
