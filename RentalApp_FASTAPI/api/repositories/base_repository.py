# api/repositories/base_repository.py

from typing import TypeVar, Type, Optional, Generic, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from api.database_models import Base

# Определяем TypeVar для модели SQLAlchemy
ModelType = TypeVar("ModelType", bound=Base)
# Определяем TypeVar для Pydantic схемы
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Базовый репозиторий для работы с моделями SQLAlchemy.
    
    Предоставляет стандартные CRUD операции для всех моделей.
    Использует дженерики для типобезопасности.
    """
    
    def __init__(self, db: AsyncSession, model: Type[ModelType]):
        """
        Инициализация репозитория.
        
        Args:
            db: Асинхронная сессия базы данных
            model: Класс модели SQLAlchemy
        """
        self.db = db
        self.model = model
    
    async def get_by_id(self, obj_id: int) -> Optional[ModelType]:
        """
        Получение объекта по ID.
        
        Args:
            obj_id: ID объекта
            
        Returns:
            Объект модели или None, если не найден
        """
        import logging
        logging.info(f"🔍 [BaseRepository.get_by_id] Ищем {self.model.__name__} с ID {obj_id}")
        result = await self.db.get(self.model, obj_id)
        if result:
            logging.info(f"✅ [BaseRepository.get_by_id] Найден {self.model.__name__} с ID {obj_id}")
        else:
            logging.warning(f"❌ [BaseRepository.get_by_id] {self.model.__name__} с ID {obj_id} не найден")
        return result
    
    async def create(self, data: CreateSchemaType) -> ModelType:
        """
        Создание нового объекта из Pydantic-схемы.
        
        Args:
            data: Pydantic схема с данными для создания
            
        Returns:
            Созданный объект модели
        """
        # Преобразуем Pydantic схему в словарь, исключая None значения
        obj_data = data.model_dump(exclude_unset=True)
        
        # Создаем экземпляр модели
        db_obj = self.model(**obj_data)
        
        # Добавляем в сессию
        self.db.add(db_obj)
        await self.db.flush()  # Получаем ID без коммита
        await self.db.refresh(db_obj)  # Обновляем объект из БД
        
        return db_obj
    
    async def update(self, db_obj: ModelType, update_data: UpdateSchemaType) -> ModelType:
        """
        Обновление существующего объекта.
        
        Args:
            db_obj: Существующий объект модели
            update_data: Pydantic схема с данными для обновления
            
        Returns:
            Обновленный объект модели
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
    
    async def get_all(self) -> List[ModelType]:
        """
        Получение всех объектов модели.
        
        Returns:
            Список всех объектов модели
        """
        result = await self.db.execute(select(self.model))
        return result.scalars().all()
    
    async def save_object(self, obj: ModelType) -> ModelType:
        """
        Сохранение готового объекта в базе данных.
        
        Args:
            obj: Готовый объект модели
            
        Returns:
            Сохраненный объект
        """
        self.db.add(obj)
        await self.db.flush()  # Получаем ID без коммита
        await self.db.refresh(obj)  # Обновляем объект из БД
        return obj

    async def save(self) -> None:
        """
        Сохранение изменений в базе данных.
        Выполняет коммит транзакции.
        """
        await self.db.commit()

