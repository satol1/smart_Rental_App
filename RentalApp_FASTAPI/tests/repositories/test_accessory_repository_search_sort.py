# tests/repositories/test_accessory_repository_search_sort.py

"""Тесты поиска и сортировки в AccessoryRepository.get_all_paginated."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.accessory_repository import AccessoryRepository


def _compile(stmt) -> str:
    """Компиляция выражения в SQL-строку с литеральными значениями для проверки."""
    return str(stmt.compile(compile_kwargs={"literal_binds": True}))


class TestAccessoryRepositorySearchSort:

    @pytest.fixture
    def mock_db_session(self):
        session = AsyncMock(spec=AsyncSession)
        # execute возвращает (count_result, page_result) через side_effect
        count_result = MagicMock()
        count_result.scalar.return_value = 0
        page_result = MagicMock()
        page_result.scalars.return_value.all.return_value = []
        session.execute.side_effect = [count_result, page_result]
        return session

    @pytest.fixture
    def repository(self, mock_db_session):
        return AccessoryRepository(mock_db_session)

    async def test_search_applies_ilike_filter_to_count_and_page(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 10, search="фонарь")

        assert mock_db_session.execute.await_count == 2
        count_stmt = mock_db_session.execute.await_args_list[0].args[0]
        page_stmt = mock_db_session.execute.await_args_list[1].args[0]

        count_sql = _compile(count_stmt)
        page_sql = _compile(page_stmt)
        assert "LIKE" in count_sql and "%фонарь%" in count_sql
        assert "LIKE" in page_sql and "%фонарь%" in page_sql

    async def test_no_search_no_filter(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 10)

        count_sql = _compile(mock_db_session.execute.await_args_list[0].args[0])
        assert "LIKE" not in count_sql

    async def test_default_order_is_name_with_id_tiebreaker(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 10)

        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "ORDER BY accessories.name ASC" in page_sql and "accessories.id" in page_sql.split("ORDER BY")[1]

    async def test_sort_by_price_desc(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 10, sort_by="price", sort_order="desc")

        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "ORDER BY accessories.price DESC" in page_sql and "accessories.id" in page_sql.split("ORDER BY")[1]

    async def test_unknown_sort_column_falls_back_to_name(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 10, sort_by="not-a-column", sort_order="desc")

        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "ORDER BY accessories.name DESC" in page_sql and "accessories.id" in page_sql.split("ORDER BY")[1]
