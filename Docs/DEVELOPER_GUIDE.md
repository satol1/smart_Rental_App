# 👨‍💻 Руководство разработчика

Практические советы и рекомендации для разработчиков системы аренды фототехники.

## 🏗️ Архитектурные принципы

### Backend
1. **Используйте сервисы-фасады** - всегда обращайтесь к главным сервисам домена
2. **Repository Pattern** - все SQL запросы только через репозитории
3. **Dependency Injection** - используйте `@inject` и `Depends(Provide[Container.service])`
4. **CQS** - разделяйте команды и запросы
5. **Финансовые расчеты** - только через `FinancialService`
6. **Изменения баланса** - только через `BalanceService`
7. **Модульная архитектура** - большие сервисы разделяйте на специализированные компоненты

### Frontend
1. **API сервисы** - все взаимодействие с API через `src/core/services`
2. **Пользовательские хуки** - инкапсулируйте логику в хуках
3. **Модульные хранилища** - используйте Zustand для состояния
4. **Компоненты** - должны быть "глупыми", только отображение
5. **Типизация** - полная типизация с TypeScript

## 🏗️ Модульная архитектура

### Пример: RentalLifecycleService

**Проблема**: Монолитный сервис на 582 строки сложен для поддержки.

**Решение**: Разделение на модульные компоненты с сохранением фасада:

```python
# Фасад - единая точка входа
class RentalLifecycleService:
    def __init__(self, creation_service, return_service, update_service, cancellation_service):
        self.creation_service = creation_service
        self.return_service = return_service
        self.update_service = update_service
        self.cancellation_service = cancellation_service
    
    async def convert_reservation_to_rental(self, reservation_id: int) -> RentalOut:
        return await self.creation_service.convert_reservation_to_rental(reservation_id)
    
    async def return_rental(self, rental_id: int, return_data: RentalReturnInput) -> RentalOut:
        return await self.return_service.return_rental(rental_id, return_data)

# Специализированные сервисы
class RentalCreationService:
    # Создание аренд из резерва и с нуля (303 строки)

class RentalReturnService:
    # Возврат аренд с расчетом штрафов (112 строк)

class RentalUpdateService:
    # Обновление аренд администратором (206 строк)

class RentalCancellationService:
    # Отмена и удаление аренд (117 строк)
```

**Преимущества**:
- ✅ **Читаемость**: Каждый файл отвечает за свою область
- ✅ **Поддерживаемость**: Изменения изолированы
- ✅ **Тестируемость**: Легче писать unit-тесты
- ✅ **Обратная совместимость**: Фасад сохраняет API

## 📋 Примеры реализации

### Копирование оборудования

**Задача**: Реализовать функционал копирования карточки оборудования в админской панели.

**Архитектурное решение**:

#### Backend
1. **Схема данных** (`shared/schemas/equipment_schema.py`):
```python
class EquipmentCopyRequest(BaseModel):
    name: Optional[str] = None
    serial_number: Optional[str] = None
    notes: Optional[str] = None
```

2. **Repository метод** (`api/repositories/equipment_command_repository.py`):
```python
async def copy_equipment(self, source_id: int, copy_data: EquipmentCopyRequest) -> Equipment:
    # Получить исходное оборудование с связями
    source_equipment = await self.get_by_id_with_details(source_id)
    # Создать новый объект с копированием полей
    new_equipment_data = EquipmentCreate(...)
    # Создать новое оборудование
    new_equipment = await self.create(new_equipment_data)
    # Копировать связи (аксессуары, ассоциации)
    return new_equipment
```

3. **Service метод** (`api/services/equipment_crud_service.py`):
```python
async def copy_equipment(self, source_id: int, copy_data: EquipmentCopyRequest) -> Equipment:
    return await self.repo.copy_equipment(source_id, copy_data)
```

4. **API эндпоинт** (`api/equipment_api.py`):
```python
@router.post("/{equipment_id}/copy", response_model=EquipmentCreateOut, status_code=201)
@inject
async def copy_equipment(
    equipment_id: int,
    copy_data: EquipmentCopyRequest,
    equipment_crud_service: EquipmentCRUDService = Depends(Provide[Container.equipment_crud_service]),
    _current_user: User = Depends(require_manager),
    _csrf_protect: CsrfProtect = Depends()
):
    return await equipment_crud_service.copy_equipment(equipment_id, copy_data)
```

#### Frontend
1. **Service метод** (`src/core/services/EquipmentService.ts`):
```typescript
static async copyEquipment(sourceId: number, copyData: EquipmentCopyRequest): Promise<Equipment> {
    const response = await api.post<Equipment>(`/equipment/${sourceId}/copy`, copyData);
    return response.data;
}
```

2. **Custom Hook** (`src/hooks/useAdminEquipment.ts`):
```typescript
export function useCopyEquipment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ sourceId, copyData }) => {
            return await EquipmentService.copyEquipment(sourceId, copyData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["equipment"] });
            toast.success("Оборудование успешно скопировано");
        }
    });
}
```

3. **UI компонент** (`src/components/equipment/EquipmentCopyDialog.tsx`):
```typescript
export default function EquipmentCopyDialog({ isOpen, onClose, sourceEquipment }: Props) {
    const copyMutation = useCopyEquipment();
    const form = useForm<CopyFormData>({
        defaultValues: {
            name: `${sourceEquipment.name} (копия)`,
            serial_number: "",
            notes: `Скопировано из ID: ${sourceEquipment.id}`,
        },
    });
    // ... остальная логика
}
```

**Ключевые принципы**:
- ✅ **Repository Pattern**: Весь доступ к БД через репозитории
- ✅ **Dependency Injection**: Использование DI-контейнера
- ✅ **CQS**: Копирование = команда в CommandRepository
- ✅ **Фасад**: EquipmentRepository как единая точка входа
- ✅ **Frontend Services**: API инкапсулирован в сервисах
- ✅ **Custom Hooks**: Логика в хуках
- ✅ **Типизация**: Полная типизация TypeScript

## 🔧 Создание нового функционала

### Backend

#### 1. Создание API эндпоинта
```python
# api/new_feature_api.py
from dependency_injector.wiring import inject, Provide
from containers import Container
from api.services.new_feature_service import NewFeatureService

@router.post("/", response_model=NewFeatureOut)
@inject
async def create_feature(
    data: NewFeatureCreate,
    service: NewFeatureService = Depends(Provide[Container.new_feature_service]),
    current_user: User = Depends(get_current_user)
):
    return await service.create_feature(data)
```

#### 2. Создание сервиса
```python
# api/services/new_feature_service.py
class NewFeatureService:
    def __init__(self, db: AsyncSession, repo: NewFeatureRepository):
        self.db = db
        self.repo = repo

    async def create_feature(self, data: NewFeatureCreate) -> NewFeatureOut:
        # Бизнес-логика
        pass
```

#### 3. Создание репозитория
```python
# api/repositories/new_feature_repository.py
class NewFeatureRepository(BaseRepository[NewFeature]):
    async def get_by_criteria(self, criteria: dict) -> List[NewFeature]:
        # SQL запросы
        pass
```

### Frontend

#### 1. Создание API сервиса
```typescript
// src/core/services/NewFeatureService.ts
export class NewFeatureService {
  static async getFeatures(): Promise<NewFeature[]> {
    const response = await api.get('/new-features');
    return response.data;
  }

  static async createFeature(data: NewFeatureCreate): Promise<NewFeature> {
    const response = await api.post('/new-features', data);
    return response.data;
  }
}
```

#### 2. Создание хука
```typescript
// src/hooks/useNewFeatures.ts
export function useNewFeatures() {
  return useQuery({
    queryKey: ['newFeatures'],
    queryFn: NewFeatureService.getFeatures,
  });
}
```

#### 3. Создание компонента
```typescript
// src/components/NewFeatureCard.tsx
interface NewFeatureCardProps {
  feature: NewFeature;
  onEdit: (id: number) => void;
}

export function NewFeatureCard({ feature, onEdit }: NewFeatureCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">{feature.name}</h3>
      <Button onClick={() => onEdit(feature.id)}>Редактировать</Button>
    </div>
  );
}
```

## 🧪 Тестирование

### Backend тесты
```bash
# Unit тесты
docker-compose -f docker-compose.unit-tests.yml run --rm test-backend pytest tests/services/test_new_feature_service.py -v

# Integration тесты
docker-compose -f docker-compose.integration-tests.yml run --rm test-backend pytest tests/integration/test_new_feature_integration.py -v

# Критичные тесты
docker-compose -f docker-compose.unit-tests.yml run --rm test-backend pytest tests/critical/ -v
```

### Frontend тесты
```bash
# Запуск тестов (в Docker)
docker-compose exec frontend npm test

# Тесты с покрытием
docker-compose exec frontend npm run test:coverage
```

## 📝 Создание миграций

```bash
# Создание миграции
docker-compose exec backend alembic revision --autogenerate -m "Add new feature table"

# Применение миграций
docker-compose exec backend alembic upgrade head

# Откат миграции
docker-compose exec backend alembic downgrade -1
```

## 🔍 Отладка

### Backend
```bash
# Логи бэкенда
docker-compose logs -f backend

# Вход в контейнер
docker-compose exec backend bash

# Проверка базы данных
docker-compose exec backend python check_tables.py
```

### Frontend
```bash
# Логи фронтенда
docker-compose logs -f frontend

# Вход в контейнер
docker-compose exec frontend sh

# Проверка сборки
docker-compose exec frontend npm run build
```

## 🚀 Развертывание

### Локальное развертывание
```bash
# Сборка и запуск
docker-compose up -d --build

# Проверка статуса
docker-compose ps
```

### Продакшен развертывание
```bash
# Сборка для продакшена
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build

# Проверка SSL сертификатов
docker-compose exec nginx nginx -t
```

## 📊 Мониторинг

### Логи
```bash
# Все логи
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Метрики
- **Backend**: http://localhost:8000/health
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

## 🔧 Полезные команды

### Docker
```bash
# Очистка Docker
docker system prune -a

# Пересборка без кэша
docker-compose build --no-cache

# Просмотр использования ресурсов
docker stats
```

### База данных
```bash
# Бэкап базы данных
docker-compose exec postgres pg_dump -U postgres rental_db > backup.sql

# Восстановление базы данных
docker-compose exec -T postgres psql -U postgres rental_db < backup.sql
```

### Git
```bash
# Создание ветки для новой фичи
git checkout -b feature/new-feature

# Коммит изменений
git add .
git commit -m "feat: add new feature"

# Пуш в репозиторий
git push origin feature/new-feature
```

## 📚 Полезные ссылки

- [Архитектура](ARCHITECTURE.md) - Подробное описание архитектуры
- [API Документация](API_DOCUMENTATION.md) - Документация API
- [Быстрый старт](QUICK_START.md) - Быстрый запуск системы
- [Развертывание](DEPLOYMENT.md) - Руководство по развертыванию

## ❓ Частые проблемы

### Проблемы с зависимостями
```bash
# Пересборка контейнеров
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Проблемы с базой данных
```bash
# Сброс базы данных
docker-compose down -v
docker-compose up -d postgres
docker-compose exec backend alembic upgrade head
```

### Проблемы с портами
```bash
# Проверка занятых портов
netstat -tulpn | grep :8000
netstat -tulpn | grep :3000

# Остановка процессов
sudo kill -9 <PID>
```

---

**Степень уверенности: 100%** - Практическое руководство для разработчиков с актуальными командами и примерами.
