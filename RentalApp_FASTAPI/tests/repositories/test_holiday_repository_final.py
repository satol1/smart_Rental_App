# tests/repositories/test_holiday_repository_final.py
"""
Финальные рабочие тесты для HolidayRepository.
Цель: повысить покрытие с 37% до 80%+
"""

import pytest
from unittest.mock import AsyncMock, Mock
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime

from api.repositories.holiday_repository import HolidayRepository
from api.models.holiday import Holiday, HolidayRule
from api.models.reservation import Reservation


class TestHolidayRepositoryFinal:
    """Финальные рабочие тесты для HolidayRepository"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        session = AsyncMock(spec=AsyncSession)
        return session

    @pytest.fixture
    def holiday_repository(self, mock_db_session):
        """Создает экземпляр HolidayRepository с мок-сессией"""
        return HolidayRepository(mock_db_session)

    @pytest.fixture
    def sample_holiday(self):
        """Образец выходного дня для тестирования"""
        return Holiday(
            date=date(2024, 1, 1),
            description="New Year Holiday",
            created_by_id=1
        )

    @pytest.fixture
    def sample_holiday_rule(self):
        """Образец правила выходного дня для тестирования"""
        return HolidayRule(
            id=1,
            rule_type="weekly",
            parameters={"day_of_week": 6},  # Sunday
            description="Weekly Sunday",
            created_by_id=1,
            created_at=datetime.now()
        )

    @pytest.fixture
    def sample_reservation(self):
        """Образец резерва для тестирования"""
        return Reservation(
            id=1,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 3)
        )

    # Тесты инициализации
    @pytest.mark.asyncio
    async def test_repository_initialization(self, mock_db_session):
        """Тест инициализации репозитория"""
        repo = HolidayRepository(mock_db_session)
        assert repo.db == mock_db_session

    @pytest.mark.asyncio
    async def test_repository_with_none_db_session(self):
        """Тест инициализации репозитория с None сессией"""
        try:
            repo = HolidayRepository(None)
            assert repo.db is None
        except (TypeError, AttributeError):
            # Это тоже валидное поведение
            pass

    # Тесты для get_holidays_paginated
    @pytest.mark.asyncio
    async def test_get_holidays_paginated_success(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест успешного получения пагинированного списка выходных"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для holidays
        mock_holidays_result = Mock()
        mock_holidays_result.scalars.return_value.all.return_value = [sample_holiday]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_holidays_result]

        # Выполняем тест
        result, total = await holiday_repository.get_holidays_paginated(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=0,
            limit=10
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1
        assert result[0].date == date(2024, 1, 1)
        assert result[0].description == "New Year Holiday"

    @pytest.mark.asyncio
    async def test_get_holidays_paginated_empty(self, holiday_repository, mock_db_session):
        """Тест получения пустого списка выходных"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 0
        
        # Создаем мок-результат для holidays
        mock_holidays_result = Mock()
        mock_holidays_result.scalars.return_value.all.return_value = []
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_holidays_result]

        # Выполняем тест
        result, total = await holiday_repository.get_holidays_paginated(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=0,
            limit=10
        )

        # Проверяем результат
        assert len(result) == 0
        assert total == 0

    # Тесты для get_rules_paginated
    @pytest.mark.asyncio
    async def test_get_rules_paginated_success(self, holiday_repository, mock_db_session, sample_holiday_rule):
        """Тест успешного получения пагинированного списка правил"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для rules
        mock_rules_result = Mock()
        mock_rules_result.scalars.return_value.all.return_value = [sample_holiday_rule]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_rules_result]

        # Выполняем тест
        result, total = await holiday_repository.get_rules_paginated(skip=0, limit=10)

        # Проверяем результат
        assert len(result) == 1
        assert total == 1
        assert result[0].id == 1
        assert result[0].description == "Weekly Sunday"

    @pytest.mark.asyncio
    async def test_get_rules_paginated_empty(self, holiday_repository, mock_db_session):
        """Тест получения пустого списка правил"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 0
        
        # Создаем мок-результат для rules
        mock_rules_result = Mock()
        mock_rules_result.scalars.return_value.all.return_value = []
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_rules_result]

        # Выполняем тест
        result, total = await holiday_repository.get_rules_paginated(skip=0, limit=10)

        # Проверяем результат
        assert len(result) == 0
        assert total == 0

    # Тесты для find_holiday_by_date
    @pytest.mark.asyncio
    async def test_find_holiday_by_date_success(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест успешного поиска выходного по дате"""
        # Создаем мок-результат
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = sample_holiday
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await holiday_repository.find_holiday_by_date(date(2024, 1, 1))

        # Проверяем результат
        assert result is not None
        assert result.date == date(2024, 1, 1)
        assert result.description == "New Year Holiday"

    @pytest.mark.asyncio
    async def test_find_holiday_by_date_not_found(self, holiday_repository, mock_db_session):
        """Тест поиска несуществующего выходного по дате"""
        # Создаем мок-результат (None)
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = None
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await holiday_repository.find_holiday_by_date(date(2024, 1, 1))

        # Проверяем результат
        assert result is None

    # Тесты для find_rule_by_id
    @pytest.mark.asyncio
    async def test_find_rule_by_id_success(self, holiday_repository, mock_db_session, sample_holiday_rule):
        """Тест успешного поиска правила по ID"""
        # Создаем мок-результат
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = sample_holiday_rule
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await holiday_repository.find_rule_by_id(1)

        # Проверяем результат
        assert result is not None
        assert result.id == 1
        assert result.description == "Weekly Sunday"

    @pytest.mark.asyncio
    async def test_find_rule_by_id_not_found(self, holiday_repository, mock_db_session):
        """Тест поиска несуществующего правила по ID"""
        # Создаем мок-результат (None)
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = None
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await holiday_repository.find_rule_by_id(999)

        # Проверяем результат
        assert result is None

    # Тесты для check_conflicting_reservations
    @pytest.mark.asyncio
    async def test_check_conflicting_reservations_success(self, holiday_repository, mock_db_session, sample_reservation):
        """Тест успешного поиска конфликтующих резервов"""
        # Создаем мок-результат - метод возвращает список ID, а не объекты
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = [1]  # Возвращаем ID, а не объект
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await holiday_repository.check_conflicting_reservations(date(2024, 1, 1))

        # Проверяем результат
        assert len(result) == 1
        assert result[0] == 1

    @pytest.mark.asyncio
    async def test_check_conflicting_reservations_empty(self, holiday_repository, mock_db_session):
        """Тест поиска конфликтующих резервов (пустой результат)"""
        # Создаем мок-результат (пустой список)
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await holiday_repository.check_conflicting_reservations(date(2024, 1, 1))

        # Проверяем результат
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_check_conflicting_reservations_multiple(self, holiday_repository, mock_db_session):
        """Тест поиска нескольких конфликтующих резервов"""
        # Создаем мок-результат - метод возвращает список ID, а не объекты
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = [1, 2]  # Возвращаем ID, а не объекты
        mock_db_session.execute.return_value = mock_result

        # Выполняем тест
        result = await holiday_repository.check_conflicting_reservations(date(2024, 1, 1))

        # Проверяем результат
        assert len(result) == 2
        assert 1 in result
        assert 2 in result

    # Тесты для save_holiday
    @pytest.mark.asyncio
    async def test_save_holiday_success(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест успешного сохранения выходного дня"""
        # Выполняем тест
        result = await holiday_repository.save_holiday(sample_holiday)

        # Проверяем результат
        assert result == sample_holiday
        mock_db_session.add.assert_called_once_with(sample_holiday)
        mock_db_session.commit.assert_called_once()
        mock_db_session.refresh.assert_called_once_with(sample_holiday)

    # Тесты для save_rule
    @pytest.mark.asyncio
    async def test_save_rule_success(self, holiday_repository, mock_db_session, sample_holiday_rule):
        """Тест успешного сохранения правила"""
        # Выполняем тест
        result = await holiday_repository.save_rule(sample_holiday_rule)

        # Проверяем результат
        assert result == sample_holiday_rule
        mock_db_session.add.assert_called_once_with(sample_holiday_rule)
        mock_db_session.flush.assert_called_once()

    # Тесты для bulk_save_holidays
    @pytest.mark.asyncio
    async def test_bulk_save_holidays_success(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест успешного массового сохранения выходных дней"""
        holidays = [sample_holiday]
        
        # Выполняем тест
        await holiday_repository.bulk_save_holidays(holidays)

        # Проверяем результат
        mock_db_session.add_all.assert_called_once_with(holidays)
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_bulk_save_holidays_empty_list(self, holiday_repository, mock_db_session):
        """Тест массового сохранения пустого списка выходных дней"""
        # Выполняем тест
        await holiday_repository.bulk_save_holidays([])

        # Проверяем результат
        mock_db_session.add_all.assert_not_called()
        mock_db_session.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_bulk_save_holidays_none_list(self, holiday_repository, mock_db_session):
        """Тест массового сохранения None списка выходных дней"""
        # Выполняем тест
        await holiday_repository.bulk_save_holidays(None)

        # Проверяем результат
        mock_db_session.add_all.assert_not_called()
        mock_db_session.commit.assert_not_called()

    # Тесты для delete_holiday
    @pytest.mark.asyncio
    async def test_delete_holiday_success(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест успешного удаления выходного дня"""
        # Выполняем тест
        await holiday_repository.delete_holiday(sample_holiday)

        # Проверяем результат
        mock_db_session.delete.assert_called_once_with(sample_holiday)
        mock_db_session.commit.assert_called_once()

    # Тесты для delete_rule
    @pytest.mark.asyncio
    async def test_delete_rule_success(self, holiday_repository, mock_db_session, sample_holiday_rule):
        """Тест успешного удаления правила"""
        # Выполняем тест
        await holiday_repository.delete_rule(sample_holiday_rule)

        # Проверяем результат
        mock_db_session.delete.assert_called_once_with(sample_holiday_rule)
        mock_db_session.commit.assert_called_once()

    # Тесты обработки ошибок
    @pytest.mark.asyncio
    async def test_database_error_handling_get_holidays(self, holiday_repository, mock_db_session):
        """Тест обработки ошибок базы данных при получении выходных"""
        # Настраиваем мок для выброса исключения
        mock_db_session.execute.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await holiday_repository.get_holidays_paginated(
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
                skip=0,
                limit=10
            )

    @pytest.mark.asyncio
    async def test_database_error_handling_get_rules(self, holiday_repository, mock_db_session):
        """Тест обработки ошибок базы данных при получении правил"""
        # Настраиваем мок для выброса исключения
        mock_db_session.execute.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await holiday_repository.get_rules_paginated(skip=0, limit=10)

    @pytest.mark.asyncio
    async def test_database_error_handling_save_holiday(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест обработки ошибок базы данных при сохранении выходного дня"""
        # Настраиваем мок для выброса исключения
        mock_db_session.commit.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await holiday_repository.save_holiday(sample_holiday)

    @pytest.mark.asyncio
    async def test_database_error_handling_save_rule(self, holiday_repository, mock_db_session, sample_holiday_rule):
        """Тест обработки ошибок базы данных при сохранении правила"""
        # Настраиваем мок для выброса исключения
        mock_db_session.flush.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await holiday_repository.save_rule(sample_holiday_rule)

    @pytest.mark.asyncio
    async def test_database_error_handling_bulk_save(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест обработки ошибок базы данных при массовом сохранении"""
        # Настраиваем мок для выброса исключения
        mock_db_session.commit.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await holiday_repository.bulk_save_holidays([sample_holiday])

    @pytest.mark.asyncio
    async def test_database_error_handling_delete_holiday(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест обработки ошибок базы данных при удалении выходного дня"""
        # Настраиваем мок для выброса исключения
        mock_db_session.commit.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await holiday_repository.delete_holiday(sample_holiday)

    @pytest.mark.asyncio
    async def test_database_error_handling_delete_rule(self, holiday_repository, mock_db_session, sample_holiday_rule):
        """Тест обработки ошибок базы данных при удалении правила"""
        # Настраиваем мок для выброса исключения
        mock_db_session.commit.side_effect = Exception("Database connection error")

        # Проверяем, что исключение пробрасывается
        with pytest.raises(Exception, match="Database connection error"):
            await holiday_repository.delete_rule(sample_holiday_rule)

    # Дополнительные тесты для покрытия edge cases
    @pytest.mark.asyncio
    async def test_pagination_parameters(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест с различными параметрами пагинации"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 5
        
        # Создаем мок-результат для holidays
        mock_holidays_result = Mock()
        mock_holidays_result.scalars.return_value.all.return_value = [sample_holiday]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_holidays_result]

        # Выполняем тест
        result, total = await holiday_repository.get_holidays_paginated(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=10,
            limit=5
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 5

    @pytest.mark.asyncio
    async def test_date_range_edge_cases(self, holiday_repository, mock_db_session, sample_holiday):
        """Тест с граничными случаями диапазона дат"""
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 1
        
        # Создаем мок-результат для holidays
        mock_holidays_result = Mock()
        mock_holidays_result.scalars.return_value.all.return_value = [sample_holiday]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_holidays_result]

        # Выполняем тест с одинаковыми датами начала и конца
        result, total = await holiday_repository.get_holidays_paginated(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 1),
            skip=0,
            limit=10
        )

        # Проверяем результат
        assert len(result) == 1
        assert total == 1

    @pytest.mark.asyncio
    async def test_multiple_holidays(self, holiday_repository, mock_db_session):
        """Тест с несколькими выходными днями"""
        # Создаем несколько выходных дней
        holiday1 = Holiday(date=date(2024, 1, 1), description="New Year", created_by_id=1)
        holiday2 = Holiday(date=date(2024, 1, 7), description="Christmas", created_by_id=1)
        
        # Создаем мок-результат для count
        mock_count_result = Mock()
        mock_count_result.scalar_one.return_value = 2
        
        # Создаем мок-результат для holidays
        mock_holidays_result = Mock()
        mock_holidays_result.scalars.return_value.all.return_value = [holiday1, holiday2]
        
        # Настраиваем мок для execute
        mock_db_session.execute.side_effect = [mock_count_result, mock_holidays_result]

        # Выполняем тест
        result, total = await holiday_repository.get_holidays_paginated(
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
            skip=0,
            limit=10
        )

        # Проверяем результат
        assert len(result) == 2
        assert total == 2
        assert result[0].date == date(2024, 1, 1)
        assert result[1].date == date(2024, 1, 7)
