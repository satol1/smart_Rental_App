# tests/repositories/test_user_repository_search_sort.py

"""Тесты поиска и сортировки в UserRepository.get_all_paginated."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.repositories.user_repository import UserRepository


def _compile(stmt) -> str:
    """Компиляция выражения в SQL-строку с литеральными значениями для проверки."""
    return str(stmt.compile(compile_kwargs={"literal_binds": True}))


class TestUserRepositorySearchSort:

    @pytest.fixture
    def mock_db_session(self):
        session = AsyncMock(spec=AsyncSession)
        count_result = MagicMock()
        count_result.scalar.return_value = 0
        page_result = MagicMock()
        page_result.scalars.return_value.all.return_value = []
        session.execute.side_effect = [count_result, page_result]
        return session

    @pytest.fixture
    def repository(self, mock_db_session):
        return UserRepository(mock_db_session)

    async def test_search_applies_ilike_filter(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 15, search="Иван")

        assert mock_db_session.execute.await_count == 2
        count_sql = _compile(mock_db_session.execute.await_args_list[0].args[0])
        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "LIKE" in count_sql and "%Иван%" in count_sql
        assert "LIKE" in page_sql and "%Иван%" in page_sql

    async def test_no_search_no_filter(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 15)

        count_sql = _compile(mock_db_session.execute.await_args_list[0].args[0])
        assert "LIKE" not in count_sql

    async def test_default_order_created_desc_with_tiebreaker(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 15)

        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "ORDER BY users.created_at DESC, users.id DESC" in page_sql

    async def test_sort_by_name_asc(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 15, sort_by="name")

        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "ORDER BY users.full_name ASC, users.id ASC" in page_sql

    async def test_sort_by_email_desc(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 15, sort_by="email_desc")

        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "ORDER BY users.email DESC, users.id DESC" in page_sql

    async def test_unknown_sort_key_falls_back_to_created_desc(self, repository, mock_db_session):
        await repository.get_all_paginated(0, 15, sort_by="hacker_key")

        page_sql = _compile(mock_db_session.execute.await_args_list[1].args[0])
        assert "ORDER BY users.created_at DESC, users.id DESC" in page_sql
