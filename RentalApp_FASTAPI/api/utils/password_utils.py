# api/utils/password_utils.py

import bcrypt


def hash_password(password: str) -> str:
    """Хеширует пароль с использованием bcrypt ($2b$)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Проверяет пароль против хеша.

    Совместима с хешами, созданными ранее через passlib (формат $2b$/$2a$):
    passlib и bcrypt используют один и тот же алгоритм bcrypt.
    """
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        # Некорректный формат хеша (легаси/повреждённый) — пароль не принят
        return False
