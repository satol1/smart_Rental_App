# api/dependencies.py

from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from dependency_injector.wiring import inject, Provide

from containers import Container, AsyncSessionLocal
from api.models.user import User as ApiUser
from api.services.calendar_service import CalendarService
from api.repositories.user_repository import UserRepository

# Схемы аутентификации
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Зависимость FastAPI, которая создает, предоставляет и закрывает 
    сессию БД для одного HTTP-запроса.
    """
    session = AsyncSessionLocal()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def get_user_by_token(
    token: str, 
    user_repo: UserRepository
) -> ApiUser | None:
    """Получает пользователя по JWT токену."""
    from jose import JWTError, jwt
    from config.core import settings
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY.get_secret_value(), algorithms=["HS256"])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
    return await user_repo.get_by_email(email)

# Базовые зависимости для аутентификации и авторизации
@inject
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: UserRepository = Depends(Provide[Container.user_repo])
) -> ApiUser:
    """Получает текущего пользователя по JWT токену."""
    user = await get_user_by_token(token, user_repo)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или просроченный токен аутентификации",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

@inject
async def get_current_user_optional(
    token: Optional[str] = Depends(optional_oauth2_scheme),
    user_repo: UserRepository = Depends(Provide[Container.user_repo])
) -> Optional[ApiUser]:
    """
    Получает текущего пользователя, если токен предоставлен.
    Возвращает None для неавторизованных пользователей.
    """
    if token is None:
        return None
    try:
        user = await get_user_by_token(token, user_repo)
        return user
    except HTTPException:
        return None


@inject
async def get_current_admin_user(
    current_user: ApiUser = Depends(get_current_user)
) -> ApiUser:
    """Проверяет, что текущий пользователь является администратором."""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для выполнения операции"
        )
    return current_user

@inject
def get_calendar_service(calendar_service: CalendarService = Depends(Provide[Container.calendar_service])) -> CalendarService:
    """Получает экземпляр сервиса календаря"""
    return calendar_service
