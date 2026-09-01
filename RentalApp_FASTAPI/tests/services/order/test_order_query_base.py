"""
Тесты для OrderQueryBase
Покрывает все методы базового класса для работы с заказами
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc, or_
from sqlalchemy.orm import selectinload
from datetime import date

from api.services.order.order_query_base import OrderQueryBase
from api.models.user import User
from api.models.equipment import Equipment
from api.models.reservation import Reservation
from api.models.rental import Rental
from shared.constants.order_status import OrderStatus


class TestOrderQueryBase:
    """Тесты для OrderQueryBase"""

    @pytest.fixture
    def mock_db_session(self):
        """Мок сессии базы данных"""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def order_query_base(self, mock_db_session):
        """Экземпляр OrderQueryBase с мокированной сессией"""
        return OrderQueryBase(mock_db_session)

    @pytest.fixture
    def mock_query(self):
        """Мок SQLAlchemy запроса"""
        query = MagicMock()
        query.join.return_value = query
        query.filter.return_value = query
        query.order_by.return_value = query
        query.offset.return_value = query
        query.limit.return_value = query
        return query

    # Тесты для _apply_user_search
    def test_apply_user_search_success(self, order_query_base, mock_query):
        """Тест успешного применения поиска по пользователю"""
        search_term = "john doe"
        
        result = order_query_base._apply_user_search(mock_query, search_term, Reservation)
        
        # Проверяем, что был вызван join и filter
        mock_query.join.assert_called_once()
        mock_query.filter.assert_called_once()
        
        # Проверяем, что результат - это тот же query объект
        assert result == mock_query

    def test_apply_user_search_empty_term(self, order_query_base, mock_query):
        """Тест поиска по пользователю с пустым термином"""
        search_term = ""
        
        result = order_query_base._apply_user_search(mock_query, search_term, Reservation)
        
        # Проверяем, что был вызван join и filter
        mock_query.join.assert_called_once()
        mock_query.filter.assert_called_once()
        assert result == mock_query

    def test_apply_user_search_case_insensitive(self, order_query_base, mock_query):
        """Тест поиска по пользователю без учета регистра"""
        search_term = "JOHN DOE"
        
        result = order_query_base._apply_user_search(mock_query, search_term, Reservation)
        
        mock_query.join.assert_called_once()
        mock_query.filter.assert_called_once()
        assert result == mock_query

    # Тесты для _apply_equipment_search
    def test_apply_equipment_search_success(self, order_query_base, mock_query):
        """Тест успешного применения поиска по оборудованию"""
        search_term = "camera"
        
        result = order_query_base._apply_equipment_search(mock_query, search_term, Reservation)
        
        # Проверяем, что был вызван filter
        mock_query.filter.assert_called_once()
        assert result == mock_query

    def test_apply_equipment_search_empty_term(self, order_query_base, mock_query):
        """Тест поиска по оборудованию с пустым термином"""
        search_term = ""
        
        result = order_query_base._apply_equipment_search(mock_query, search_term, Reservation)
        
        mock_query.filter.assert_called_once()
        assert result == mock_query

    def test_apply_equipment_search_brand(self, order_query_base, mock_query):
        """Тест поиска по бренду оборудования"""
        search_term = "canon"
        
        result = order_query_base._apply_equipment_search(mock_query, search_term, Rental)
        
        mock_query.filter.assert_called_once()
        assert result == mock_query

    def test_apply_equipment_search_type(self, order_query_base, mock_query):
        """Тест поиска по типу оборудования"""
        search_term = "lens"
        
        result = order_query_base._apply_equipment_search(mock_query, search_term, Reservation)
        
        mock_query.filter.assert_called_once()
        assert result == mock_query

    # Тесты для _apply_status_filter
    def test_apply_status_filter_none(self, order_query_base, mock_query):
        """Тест фильтрации по статусу - None (без фильтра)"""
        result = order_query_base._apply_status_filter(mock_query, None, Reservation)
        
        # Не должно быть вызовов filter
        mock_query.filter.assert_not_called()
        assert result == mock_query

    def test_apply_status_filter_empty(self, order_query_base, mock_query):
        """Тест фильтрации по статусу - пустая строка"""
        result = order_query_base._apply_status_filter(mock_query, "", Reservation)
        
        # Не должно быть вызовов filter
        mock_query.filter.assert_not_called()
        assert result == mock_query

    def test_apply_status_filter_active(self, order_query_base, mock_query):
        """Тест фильтрации по активному статусу"""
        with patch('api.services.order.order_query_base.date') as mock_date:
            mock_date.today.return_value = date(2024, 1, 15)
            
            result = order_query_base._apply_status_filter(mock_query, OrderStatus.ACTIVE, Reservation)
            
            mock_query.filter.assert_called_once()
            assert result == mock_query

    def test_apply_status_filter_completed(self, order_query_base, mock_query):
        """Тест фильтрации по завершенному статусу"""
        result = order_query_base._apply_status_filter(mock_query, OrderStatus.COMPLETED, Rental)
        
        mock_query.filter.assert_called_once()
        assert result == mock_query

    def test_apply_status_filter_overdue(self, order_query_base, mock_query):
        """Тест фильтрации по просроченному статусу"""
        with patch('api.services.order.order_query_base.date') as mock_date:
            mock_date.today.return_value = date(2024, 1, 15)
            
            result = order_query_base._apply_status_filter(mock_query, OrderStatus.OVERDUE, Reservation)
            
            mock_query.filter.assert_called_once()
            assert result == mock_query

    # Тесты для _apply_sorting
    def test_apply_sorting_none(self, order_query_base, mock_query):
        """Тест сортировки - None (сортировка по умолчанию)"""
        result = order_query_base._apply_sorting(mock_query, None, Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_empty(self, order_query_base, mock_query):
        """Тест сортировки - пустая строка"""
        result = order_query_base._apply_sorting(mock_query, "", Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_id_desc(self, order_query_base, mock_query):
        """Тест сортировки по ID по убыванию"""
        result = order_query_base._apply_sorting(mock_query, "id_desc", Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_id_asc(self, order_query_base, mock_query):
        """Тест сортировки по ID по возрастанию"""
        result = order_query_base._apply_sorting(mock_query, "id_asc", Rental)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_start_date_desc(self, order_query_base, mock_query):
        """Тест сортировки по дате начала по убыванию"""
        result = order_query_base._apply_sorting(mock_query, "start_date_desc", Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_start_date_asc(self, order_query_base, mock_query):
        """Тест сортировки по дате начала по возрастанию"""
        result = order_query_base._apply_sorting(mock_query, "start_date_asc", Rental)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_end_date_desc(self, order_query_base, mock_query):
        """Тест сортировки по дате окончания по убыванию"""
        result = order_query_base._apply_sorting(mock_query, "end_date_desc", Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_end_date_asc(self, order_query_base, mock_query):
        """Тест сортировки по дате окончания по возрастанию"""
        result = order_query_base._apply_sorting(mock_query, "end_date_asc", Rental)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_count_desc(self, order_query_base, mock_query):
        """Тест сортировки по количеству оборудования по убыванию"""
        result = order_query_base._apply_sorting(mock_query, "count_desc", Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_count_asc(self, order_query_base, mock_query):
        """Тест сортировки по количеству оборудования по возрастанию"""
        result = order_query_base._apply_sorting(mock_query, "count_asc", Rental)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_unknown_field(self, order_query_base, mock_query):
        """Тест сортировки по неизвестному полю (fallback к умолчанию)"""
        result = order_query_base._apply_sorting(mock_query, "unknown_field", Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_sorting_default_direction(self, order_query_base, mock_query):
        """Тест сортировки без указания направления (по умолчанию desc)"""
        result = order_query_base._apply_sorting(mock_query, "id", Reservation)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    # Тесты для _apply_pagination
    def test_apply_pagination_success(self, order_query_base, mock_query):
        """Тест успешного применения пагинации"""
        skip = 10
        limit = 20
        
        result = order_query_base._apply_pagination(mock_query, skip, limit)
        
        mock_query.offset.assert_called_once_with(skip)
        mock_query.limit.assert_called_once_with(limit)
        assert result == mock_query

    def test_apply_pagination_zero_values(self, order_query_base, mock_query):
        """Тест пагинации с нулевыми значениями"""
        skip = 0
        limit = 0
        
        result = order_query_base._apply_pagination(mock_query, skip, limit)
        
        mock_query.offset.assert_called_once_with(skip)
        mock_query.limit.assert_called_once_with(limit)
        assert result == mock_query

    def test_apply_pagination_large_values(self, order_query_base, mock_query):
        """Тест пагинации с большими значениями"""
        skip = 1000
        limit = 500
        
        result = order_query_base._apply_pagination(mock_query, skip, limit)
        
        mock_query.offset.assert_called_once_with(skip)
        mock_query.limit.assert_called_once_with(limit)
        assert result == mock_query

    # Тесты для _get_total_count
    @pytest.mark.asyncio
    async def test_get_total_count_success(self, order_query_base, mock_db_session, mock_query):
        """Тест успешного получения общего количества записей"""
        expected_count = 42
        
        # Настраиваем мок для subquery - создаем реальный объект subquery
        from sqlalchemy import select, func
        from api.models.reservation import Reservation
        
        # Создаем реальный subquery
        real_subquery = select(Reservation.id).subquery()
        mock_query.subquery.return_value = real_subquery
        
        # Настраиваем мок для execute
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = expected_count
        mock_db_session.execute.return_value = mock_result
        
        result = await order_query_base._get_total_count(mock_query)
        
        assert result == expected_count
        mock_db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_total_count_zero(self, order_query_base, mock_db_session, mock_query):
        """Тест получения нулевого количества записей"""
        expected_count = 0
        
        # Настраиваем мок для subquery - создаем реальный объект subquery
        from sqlalchemy import select
        from api.models.reservation import Reservation
        
        # Создаем реальный subquery
        real_subquery = select(Reservation.id).subquery()
        mock_query.subquery.return_value = real_subquery
        
        # Настраиваем мок для execute
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = expected_count
        mock_db_session.execute.return_value = mock_result
        
        result = await order_query_base._get_total_count(mock_query)
        
        assert result == expected_count
        mock_db_session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_total_count_database_error(self, order_query_base, mock_db_session, mock_query):
        """Тест ошибки базы данных при получении количества"""
        # Настраиваем мок для subquery - создаем реальный объект subquery
        from sqlalchemy import select
        from api.models.reservation import Reservation
        
        # Создаем реальный subquery
        real_subquery = select(Reservation.id).subquery()
        mock_query.subquery.return_value = real_subquery
        
        # Настраиваем мок для выброса исключения
        mock_db_session.execute.side_effect = Exception("Database error")
        
        with pytest.raises(Exception) as exc_info:
            await order_query_base._get_total_count(mock_query)
        
        assert "Database error" in str(exc_info.value)

    # Тесты для _get_equipment_joins
    def test_get_equipment_joins_default(self, order_query_base):
        """Тест получения стандартных JOIN'ов для оборудования"""
        joins = order_query_base._get_equipment_joins()
        
        assert len(joins) == 2
        # Проверяем, что возвращаются правильные типы
        assert all(hasattr(join, 'selectinload') for join in joins)

    # Комплексные тесты
    def test_apply_multiple_filters(self, order_query_base, mock_query):
        """Тест применения нескольких фильтров подряд"""
        # Применяем поиск по пользователю
        result1 = order_query_base._apply_user_search(mock_query, "john", Reservation)
        
        # Применяем поиск по оборудованию
        result2 = order_query_base._apply_equipment_search(result1, "camera", Reservation)
        
        # Применяем фильтр по статусу
        result3 = order_query_base._apply_status_filter(result2, OrderStatus.ACTIVE, Reservation)
        
        # Применяем сортировку
        result4 = order_query_base._apply_sorting(result3, "start_date_desc", Reservation)
        
        # Применяем пагинацию
        result5 = order_query_base._apply_pagination(result4, 0, 10)
        
        # Все результаты должны быть одним и тем же объектом
        assert result1 == result2 == result3 == result4 == result5 == mock_query

    def test_apply_sorting_with_rental_model(self, order_query_base, mock_query):
        """Тест сортировки с моделью Rental"""
        result = order_query_base._apply_sorting(mock_query, "end_date_asc", Rental)
        
        mock_query.order_by.assert_called_once()
        assert result == mock_query

    def test_apply_status_filter_with_rental_model(self, order_query_base, mock_query):
        """Тест фильтрации по статусу с моделью Rental"""
        with patch('api.services.order.order_query_base.date') as mock_date:
            mock_date.today.return_value = date(2024, 1, 15)
            
            result = order_query_base._apply_status_filter(mock_query, OrderStatus.OVERDUE, Rental)
            
            mock_query.filter.assert_called_once()
            assert result == mock_query

    def test_apply_equipment_search_with_rental_model(self, order_query_base, mock_query):
        """Тест поиска по оборудованию с моделью Rental"""
        result = order_query_base._apply_equipment_search(mock_query, "lens", Rental)
        
        mock_query.filter.assert_called_once()
        assert result == mock_query

    def test_apply_user_search_with_rental_model(self, order_query_base, mock_query):
        """Тест поиска по пользователю с моделью Rental"""
        result = order_query_base._apply_user_search(mock_query, "jane", Rental)
        
        mock_query.join.assert_called_once()
        mock_query.filter.assert_called_once()
        assert result == mock_query
