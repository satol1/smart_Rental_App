# api/permissions.py
from fastapi import Depends, HTTPException
from api.dependencies import get_current_user
from api.models.user import User

# Приоритет ролей: user < manager < admin
ROLE_PRIORITY = {"user": 0, "manager": 1, "admin": 2}

def require_user(user: User = Depends(get_current_user)):
    # Любой залогиненный пользователь
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Пользователь неактивен")
    return user

def require_manager(user: User = Depends(get_current_user)):
    # Менеджер и выше
    if ROLE_PRIORITY.get(user.role, 0) < ROLE_PRIORITY["manager"]:
        raise HTTPException(status_code=403, detail="Недостаточно прав (требуется manager или admin)")
    return user

def require_admin(user: User = Depends(get_current_user)):
    # Только администратор
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Недостаточно прав (требуется admin)")
    return user
