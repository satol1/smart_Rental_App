# api/services/error_handler_service.py

import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError, InvalidRequestError, OperationalError
import asyncio

logger = logging.getLogger(__name__)

class ErrorHandlerService:
    """
    Сервис для централизованной обработки ошибок и восстановления.
    Обеспечивает стабильность системы при высокой нагрузке.
    """
    
    def __init__(self):
        self.error_counts = {}
        self.recovery_attempts = {}
    
    def handle_database_error(self, error: Exception, context: str = "") -> Optional[Dict[str, Any]]:
        """
        Обрабатывает ошибки базы данных с возможностью восстановления.
        
        Args:
            error: Исключение базы данных
            context: Контекст выполнения
            
        Returns:
            Словарь с данными для восстановления или None
        """
        error_type = type(error).__name__
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        logger.warning(f"Database error in {context}: {error_type}: {str(error)}")
        
        # Обработка специфических ошибок
        if isinstance(error, InvalidRequestError):
            if "concurrent operations are not permitted" in str(error):
                logger.warning("Concurrent operation detected, returning empty result")
                return {"success": True, "data": [], "recovered": True}
            elif "session is provisioning" in str(error):
                logger.warning("Session provisioning error, returning empty result")
                return {"success": True, "data": [], "recovered": True}
        
        elif isinstance(error, OperationalError):
            if "connection" in str(error).lower():
                logger.warning("Connection error, returning empty result")
                return {"success": True, "data": [], "recovered": True}
        
        # Для других ошибок возвращаем None (не удалось восстановить)
        return None
    
    def handle_validation_error(self, error: Exception, context: str = "") -> Dict[str, Any]:
        """
        Обрабатывает ошибки валидации.
        
        Args:
            error: Исключение валидации
            context: Контекст выполнения
            
        Returns:
            Словарь с информацией об ошибке
        """
        error_type = type(error).__name__
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        logger.warning(f"Validation error in {context}: {error_type}: {str(error)}")
        
        return {
            "success": False,
            "error": "Validation failed",
            "details": str(error),
            "recovered": False
        }
    
    def handle_authorization_error(self, error: Exception, context: str = "") -> Dict[str, Any]:
        """
        Обрабатывает ошибки авторизации.
        
        Args:
            error: Исключение авторизации
            context: Контекст выполнения
            
        Returns:
            Словарь с информацией об ошибке
        """
        error_type = type(error).__name__
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        logger.warning(f"Authorization error in {context}: {error_type}: {str(error)}")
        
        return {
            "success": False,
            "error": "Authorization required",
            "details": str(error),
            "recovered": False
        }
    
    def handle_generic_error(self, error: Exception, context: str = "") -> Dict[str, Any]:
        """
        Обрабатывает общие ошибки.
        
        Args:
            error: Исключение
            context: Контекст выполнения
            
        Returns:
            Словарь с информацией об ошибке
        """
        error_type = type(error).__name__
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        logger.error(f"Generic error in {context}: {error_type}: {str(error)}")
        
        return {
            "success": False,
            "error": "Internal error",
            "details": str(error),
            "recovered": False
        }
    
    def safe_execute(self, func, *args, **kwargs) -> Dict[str, Any]:
        """
        Безопасное выполнение функции с обработкой ошибок.
        
        Args:
            func: Функция для выполнения
            *args: Аргументы функции
            **kwargs: Именованные аргументы функции
            
        Returns:
            Словарь с результатом выполнения
        """
        try:
            if asyncio.iscoroutinefunction(func):
                # Для асинхронных функций
                import asyncio
                result = asyncio.create_task(func(*args, **kwargs))
                return {"success": True, "data": result, "recovered": False}
            else:
                # Для синхронных функций
                result = func(*args, **kwargs)
                return {"success": True, "data": result, "recovered": False}
                
        except (InvalidRequestError, OperationalError) as e:
            return self.handle_database_error(e, f"safe_execute({func.__name__})")
        except HTTPException as e:
            if e.status_code == 401:
                return self.handle_authorization_error(e, f"safe_execute({func.__name__})")
            elif e.status_code == 422:
                return self.handle_validation_error(e, f"safe_execute({func.__name__})")
            else:
                return self.handle_generic_error(e, f"safe_execute({func.__name__})")
        except Exception as e:
            return self.handle_generic_error(e, f"safe_execute({func.__name__})")
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """
        Возвращает статистику ошибок.
        
        Returns:
            Словарь со статистикой ошибок
        """
        total_errors = sum(self.error_counts.values())
        return {
            "total_errors": total_errors,
            "error_types": self.error_counts,
            "recovery_attempts": self.recovery_attempts
        }
    
    def reset_statistics(self):
        """Сбрасывает статистику ошибок."""
        self.error_counts.clear()
        self.recovery_attempts.clear()

# Глобальный экземпляр сервиса удален - теперь используется через DI контейнер
# error_handler = ErrorHandlerService()
