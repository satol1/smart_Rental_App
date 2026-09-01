# Пример для api/init_models.py
from containers import engine
from api.database_models import Base
# ✅ Этот импорт уже включает наш новый класс PromoCodeApplicableType
from api.models import user, equipment, reservation, accessory, promo_code

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("✅ FastAPI-модели успешно инициализированы")