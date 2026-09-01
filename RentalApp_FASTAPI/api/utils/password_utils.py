# api/utils/password_utils.py

import warnings
# Подавляем предупреждения о deprecated модуле crypt (используется внутри passlib)
warnings.filterwarnings("ignore", message=".*'crypt'.*", category=DeprecationWarning)
warnings.filterwarnings("ignore", message=".*crypt.*", category=DeprecationWarning)

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Хеширует пароль с использованием bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Проверяет пароль против хеша."""
    return pwd_context.verify(plain, hashed)
