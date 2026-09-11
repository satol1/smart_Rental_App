# tests/services/test_catalog_sql_pagination.py
"""
Этап 3.1 аудита 2026-09-12: пагинация каталога в SQL.

Пачки идут первыми, оборудование — за ними; окно страницы раскладывается
на два SQL-запроса (пачки в Python — их мало, оборудование — offset/limit
в БД с исключением элементов пачек). Pydantic строится только для записей
страницы, а не для всего каталога.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date

from api.services.equipment_service_api import EquipmentServiceApi
from api.models.equipment import Equipment


def _equipment(eid: int, name: str) -> Equipment:
    eq = Equipment(id=eid, name=name, equipment_type="ski", brand="B",
                   condition="Good", daily_rate=100.0)
    return eq


def _pack(pid: int, equipment_ids):
    pack = MagicMock()
    pack.id = pid
    pack.equipment_ids = list(equipment_ids)
    # Обязательные поля PublicPackOut
    pack.entity_type = "pack"
    pack.name = f"Pack {pid}"
    pack.equipment_type = "ski"
    pack.brand = "Brand"
    pack.total_count = len(equipment_ids)
    pack.available_count = len(equipment_ids)
    pack.min_daily_rate = 100.0
    pack.image_url = None
    pack.cheapest_available_id = None
    return pack


def _make_service(packs, standalone_pages: dict, standalone_total: int):
    """standalone_pages: {(offset, limit): [Equipment, ...]} — что вернёт БД."""
    service = EquipmentServiceApi.__new__(EquipmentServiceApi)
    service.pack_service = MagicMock()
    service.pack_service.get_filtered_packs_async = AsyncMock(return_value=packs)

    filter_service = MagicMock()

    async def fake_paginated(skip, limit, *args, **kwargs):
        # total из выборки = standalone-количество (сервис его переиспользует)
        return standalone_pages.get((skip, limit), []), standalone_total

    filter_service.get_paginated_equipment = AsyncMock(side_effect=fake_paginated)
    filter_service.count_standalone_equipment = AsyncMock(return_value=standalone_total)
    filter_service.calculate_available_filters = AsyncMock(return_value={})
    service.filter_service = filter_service
    return service


class TestCatalogSqlPagination:

    @pytest.mark.asyncio
    async def test_page_within_packs_uses_only_packs(self):
        """Окно страницы целиком внутри пачек — оборудование не запрашивается."""
        packs = [_pack(1, [10, 11]), _pack(2, [12])]
        service = _make_service(packs, {(0, 2): []}, standalone_total=5)

        items, total, _ = await service.get_paginated_equipment(
            skip=0, limit=2, group_similar=True
        )

        assert len(items) == 2  # обе пачки
        service.filter_service.get_paginated_equipment.assert_not_awaited()
        assert total == 2 + 5  # пачки + standalone-оборудование

    @pytest.mark.asyncio
    async def test_page_spanning_packs_and_equipment(self):
        """Страница пересекает границу пачки/оборудования: остаток берётся из SQL."""
        packs = [_pack(1, [10, 11]), _pack(2, [12])]
        eq_page = [_equipment(20, "Ski A")]
        service = _make_service(packs, {(0, 1): eq_page}, standalone_total=3)

        items, total, _ = await service.get_paginated_equipment(
            skip=1, limit=2, group_similar=True
        )

        # Первая позиция — вторая пачка, вторая — оборудование с offset 0
        assert items[0].id == 2
        assert items[1].id == 20
        service.filter_service.get_paginated_equipment.assert_awaited_once()
        args = service.filter_service.get_paginated_equipment.await_args
        assert args.args[0] == 0  # equipment offset
        assert args.args[1] == 1  # remaining slots
        assert args.kwargs.get("exclude_equipment_ids") == [10, 11, 12]

    @pytest.mark.asyncio
    async def test_page_beyond_packs_offsets_equipment(self):
        """skip за пределами пачек — оборудование берётся с offset = skip - packs."""
        packs = [_pack(1, [10])]
        eq_page = [_equipment(21, "Ski B")]
        service = _make_service(packs, {(2, 2): eq_page}, standalone_total=8)

        items, total, _ = await service.get_paginated_equipment(
            skip=3, limit=2, group_similar=True
        )

        assert [i.id for i in items] == [21]
        args = service.filter_service.get_paginated_equipment.await_args
        assert args.args[0] == 2  # 3 - 1 пачка
        assert total == 1 + 8

    @pytest.mark.asyncio
    async def test_without_grouping_direct_sql_pagination(self):
        """Без группировки — прямая SQL-пагинация, пачки не запрашиваются."""
        eq_page = [_equipment(30, "Ski C"), _equipment(31, "Ski D")]
        service = _make_service([], {(2, 2): eq_page}, standalone_total=10)

        items, total, _ = await service.get_paginated_equipment(
            skip=2, limit=2, group_similar=False
        )

        assert [i.id for i in items] == [30, 31]
        service.pack_service.get_filtered_packs_async.assert_not_awaited()
        # total приходит напрямую из SQL-пагинации репозитория
        assert total == 10
