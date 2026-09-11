# api/services/equipment_defaults.py
"""
Дефолты для nullable-полей оборудования при выдаче.

set_committed_value проставляет значение как загруженное из БД: объект НЕ
помечается dirty, поэтому middleware не пишет «починенные» дефолты в БД
при простом просмотре каталога (GET больше не мутирует данные).
"""

from typing import Iterable

from sqlalchemy.orm.attributes import set_committed_value

from api.models.equipment import Equipment

_DEFAULTS = {
    "name": "Неизвестное оборудование",
    "daily_rate": 0.0,
    "condition": "Великолепно",
}


def apply_equipment_field_defaults(equipment_list: Iterable[Equipment]) -> None:
    """Заполняет None-поля оборудования дефолтами без записи в БД."""
    for equipment in equipment_list:
        for field_name, default in _DEFAULTS.items():
            if getattr(equipment, field_name, None) is None:
                set_committed_value(equipment, field_name, default)
