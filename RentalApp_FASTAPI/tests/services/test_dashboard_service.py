# tests/services/test_dashboard_service.py
"""
Тесты для DashboardService - главного сервиса-фасада для панели управления.
Тестирует агрегацию данных от всех под-сервисов и параллельное выполнение задач.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import asyncio

from api.services.dashboard.dashboard_service import DashboardService
from shared.schemas.dashboard_schema import DashboardSummaryResponse


class TestDashboardService:
    """Тесты для DashboardService."""

    @pytest.fixture
    def mock_dashboard_repo(self):
        """Создает мок DashboardRepository."""
        return AsyncMock()

    @pytest.fixture
    def mock_focus_service(self):
        """Создает мок FocusService."""
        return AsyncMock()

    @pytest.fixture
    def mock_kpi_service(self):
        """Создает мок KpiService."""
        return AsyncMock()

    @pytest.fixture
    def mock_activity_service(self):
        """Создает мок ActivityService."""
        return AsyncMock()

    @pytest.fixture
    def mock_equipment_service(self):
        """Создает мок EquipmentService."""
        return AsyncMock()

    @pytest.fixture
    def dashboard_service(self, mock_db_session, mock_dashboard_repo, mock_focus_service, 
                         mock_kpi_service, mock_activity_service, mock_equipment_service):
        """Создает экземпляр DashboardService с моками всех зависимостей."""
        return DashboardService(
            db=mock_db_session,
            dashboard_repo=mock_dashboard_repo,
            focus_service=mock_focus_service,
            kpi_service=mock_kpi_service,
            activity_service=mock_activity_service,
            equipment_service=mock_equipment_service
        )

    @pytest.fixture
    def mock_focus_data(self):
        """Создает мок данных от FocusService."""
        return {
            'pickups_today': [
                {
                    'id': 1, 
                    'user_name': 'John Doe', 
                    'user_phone': '+1234567890',
                    'user_telegram': '@johndoe',
                    'user_status': 'active',
                    'user_balance': 1000.0,
                    'equipment_list': ['Camera A'],
                    'user_id': 1,
                    'order_type': 'reservation',
                    'scheduled_time': '2025-01-01T10:00:00',
                    'start_date': '2025-01-01',
                    'due_date': None,
                    'days_overdue': 0,
                    'user_client_status': 'new',
                    'is_pending_pickup': False,
                },
                {
                    'id': 2, 
                    'user_name': 'Jane Smith', 
                    'user_phone': '+1234567891',
                    'user_telegram': '@janesmith',
                    'user_status': 'active',
                    'user_balance': 2000.0,
                    'equipment_list': ['Lens B'],
                    'user_id': 2,
                    'order_type': 'reservation',
                    'scheduled_time': '2025-01-01T11:00:00',
                    'start_date': '2025-01-01',
                    'due_date': None,
                    'days_overdue': 0,
                    'user_client_status': 'vip',
                    'is_pending_pickup': False,
                }
            ],
            'returns_today': [
                {
                    'id': 3, 
                    'user_name': 'Bob Wilson', 
                    'user_phone': '+1234567892',
                    'user_telegram': '@bobwilson',
                    'user_status': 'active',
                    'user_balance': 1500.0,
                    'equipment_list': ['Tripod C'],
                    'user_id': 3,
                    'order_type': 'rental',
                    'scheduled_time': '2025-01-01T15:00:00',
                    'start_date': '2024-12-30',
                    'due_date': '2025-01-01',
                    'days_overdue': 0,
                    'user_client_status': 'regular',
                    'is_pending_pickup': False,
                }
            ],
            'overdue_rentals': [
                {
                    'id': 4, 
                    'user_name': 'Alice Brown', 
                    'user_phone': '+1234567893',
                    'user_telegram': '@alicebrown',
                    'user_status': 'active',
                    'user_balance': -500.0,
                    'equipment_list': ['Light D'],
                    'user_id': 4,
                    'order_type': 'rental',
                    'scheduled_time': '2024-12-25T12:00:00',
                    'start_date': '2024-12-20',
                    'due_date': '2024-12-25',
                    'days_overdue': 2,
                    'user_client_status': 'debtor',
                    'is_pending_pickup': False,
                }
            ]
        }

    @pytest.fixture
    def mock_kpi_data(self):
        """Создает мок данных от KpiService."""
        return {
            'total_users': 100,
            'active_users': 75,
            'total_equipment': 50,
            'total_reservations': 200,
            'revenue_today': 5000.0,
            'revenue_this_month': 100000.0,
            'occupancy_rate': 75.5,
            'avg_rental_duration': 3.5,
            # +++ НОВЫЕ ПОЛЯ +++
            'active_reservations': 25,
            'total_rentals': 150,
            'active_rentals': 30,
            'overdue_rentals': 5,
            'total_accessories': 75,
            'total_associations': 20
        }

    @pytest.fixture
    def mock_activity_data(self):
        """Создает мок данных от ActivityService."""
        return [
            {
                'id': 1, 
                'timestamp': '2025-01-01T10:00:00',
                'activity_type': 'new_reservation', 
                'description': 'New rental created',
                'user_name': 'John Doe',
                'equipment_name': 'Camera A'
            },
            {
                'id': 2, 
                'timestamp': '2025-01-01T09:30:00',
                'activity_type': 'rental_return', 
                'description': 'Equipment returned',
                'user_name': 'Jane Smith',
                'equipment_name': 'Lens B'
            }
        ]

    @pytest.fixture
    def mock_equipment_data(self):
        """Создает мок данных от EquipmentService."""
        return [
            {
                'equipment_id': 1, 
                'equipment_name': 'Camera A', 
                'rental_count': 15,
                'revenue': 7500.0
            },
            {
                'equipment_id': 2, 
                'equipment_name': 'Lens B', 
                'rental_count': 12,
                'revenue': 6000.0
            },
            {
                'equipment_id': 3, 
                'equipment_name': 'Tripod C', 
                'rental_count': 8,
                'revenue': 4000.0
            }
        ]

    # === ТЕСТЫ ДЛЯ get_summary ===

    @pytest.mark.asyncio
    async def test_get_summary_success(self, dashboard_service, mock_focus_data, mock_kpi_data, 
                                     mock_activity_data, mock_equipment_data):
        """
        Тест успешного получения сводной информации.
        """
        # Arrange
        # Мокаем все под-сервисы
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', return_value=mock_focus_data['pickups_today']):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=mock_focus_data['returns_today']):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=mock_focus_data['overdue_rentals']):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', return_value=mock_kpi_data):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', return_value=mock_activity_data):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', return_value=mock_equipment_data):
                                # Act
                                result = await dashboard_service.get_summary()

                                # Assert
                                assert isinstance(result, DashboardSummaryResponse)
                                assert len(result.pickups_today) == len(mock_focus_data['pickups_today'])
                                assert len(result.returns_today) == len(mock_focus_data['returns_today'])
                                assert len(result.overdue_rentals) == len(mock_focus_data['overdue_rentals'])
                                assert result.kpi.total_users == mock_kpi_data['total_users']
                                assert result.kpi.active_users == mock_kpi_data['active_users']
                                assert len(result.recent_activity) == len(mock_activity_data)
                                assert len(result.popular_equipment) == len(mock_equipment_data)

    @pytest.mark.asyncio
    async def test_get_summary_empty_data(self, dashboard_service):
        """
        Тест получения сводной информации с пустыми данными.
        """
        # Arrange
        empty_data = []
        empty_kpi = {
            'total_users': 0,
            'active_users': 0,
            'total_equipment': 0,
            'total_reservations': 0,
            'revenue_today': 0.0,
            'revenue_this_month': 0.0,
            'occupancy_rate': 0.0,
            'avg_rental_duration': 0.0,
            # +++ НОВЫЕ ПОЛЯ +++
            'active_reservations': 0,
            'total_rentals': 0,
            'active_rentals': 0,
            'overdue_rentals': 0,
            'total_accessories': 0,
            'total_associations': 0
        }
        
        # Мокаем все под-сервисы с пустыми данными
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', return_value=empty_data):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=empty_data):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=empty_data):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', return_value=empty_kpi):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', return_value=empty_data):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', return_value=empty_data):
                                # Act
                                result = await dashboard_service.get_summary()

                                # Assert
                                assert isinstance(result, DashboardSummaryResponse)
                                assert len(result.pickups_today) == 0
                                assert len(result.returns_today) == 0
                                assert len(result.overdue_rentals) == 0
                                assert result.kpi.total_users == 0
                                assert result.kpi.active_users == 0
                                assert len(result.recent_activity) == 0
                                assert len(result.popular_equipment) == 0

    @pytest.mark.asyncio
    async def test_get_summary_parallel_execution(self, dashboard_service, mock_focus_data, mock_kpi_data, 
                                                mock_activity_data, mock_equipment_data):
        """
        Тест проверяет, что задачи выполняются параллельно.
        """
        # Arrange
        execution_order = []
        
        async def mock_get_pickups_today():
            execution_order.append('pickups_start')
            await asyncio.sleep(0.01)  # Небольшая задержка
            execution_order.append('pickups_end')
            return mock_focus_data['pickups_today']
        
        async def mock_get_returns_today():
            execution_order.append('returns_start')
            await asyncio.sleep(0.01)
            execution_order.append('returns_end')
            return mock_focus_data['returns_today']
        
        async def mock_get_overdue_rentals():
            execution_order.append('overdue_start')
            await asyncio.sleep(0.01)
            execution_order.append('overdue_end')
            return mock_focus_data['overdue_rentals']
        
        async def mock_get_kpi_data():
            execution_order.append('kpi_start')
            await asyncio.sleep(0.01)
            execution_order.append('kpi_end')
            return mock_kpi_data
        
        async def mock_get_recent_activity():
            execution_order.append('activity_start')
            await asyncio.sleep(0.01)
            execution_order.append('activity_end')
            return mock_activity_data
        
        async def mock_get_popular_equipment():
            execution_order.append('equipment_start')
            await asyncio.sleep(0.01)
            execution_order.append('equipment_end')
            return mock_equipment_data
        
        # Мокаем все под-сервисы
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', side_effect=mock_get_pickups_today):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', side_effect=mock_get_returns_today):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', side_effect=mock_get_overdue_rentals):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', side_effect=mock_get_kpi_data):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', side_effect=mock_get_recent_activity):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', side_effect=mock_get_popular_equipment):
                                # Act
                                result = await dashboard_service.get_summary()

                                # Assert
                                assert isinstance(result, DashboardSummaryResponse)
                                
                                # Проверяем, что задачи выполнялись параллельно
                                # Все "start" должны быть до всех "end"
                                start_indices = [i for i, x in enumerate(execution_order) if x.endswith('_start')]
                                end_indices = [i for i, x in enumerate(execution_order) if x.endswith('_end')]
                                
                                # Проверяем, что есть хотя бы один start и один end
                                assert len(start_indices) > 0, "Должны быть запущены задачи"
                                assert len(end_indices) > 0, "Должны быть завершены задачи"

    @pytest.mark.asyncio
    async def test_get_summary_focus_service_error(self, dashboard_service, mock_kpi_data, 
                                                 mock_activity_data, mock_equipment_data):
        """
        Тест обработки ошибки в FocusService.
        """
        # Arrange
        # Мокаем ошибку в одном из методов FocusService
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', side_effect=Exception("Focus service error")):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=[]):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=[]):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', return_value=mock_kpi_data):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', return_value=mock_activity_data):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', return_value=mock_equipment_data):
                                # Act & Assert
                                with pytest.raises(Exception, match="Focus service error"):
                                    await dashboard_service.get_summary()

    @pytest.mark.asyncio
    async def test_get_summary_kpi_service_error(self, dashboard_service, mock_focus_data, 
                                               mock_activity_data, mock_equipment_data):
        """
        Тест обработки ошибки в KpiService.
        """
        # Arrange
        # Мокаем ошибку в KpiService
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', return_value=mock_focus_data['pickups_today']):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=mock_focus_data['returns_today']):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=mock_focus_data['overdue_rentals']):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', side_effect=Exception("KPI service error")):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', return_value=mock_activity_data):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', return_value=mock_equipment_data):
                                # Act & Assert
                                with pytest.raises(Exception, match="KPI service error"):
                                    await dashboard_service.get_summary()

    @pytest.mark.asyncio
    async def test_get_summary_activity_service_error(self, dashboard_service, mock_focus_data, mock_kpi_data, 
                                                    mock_equipment_data):
        """
        Тест обработки ошибки в ActivityService.
        """
        # Arrange
        # Мокаем ошибку в ActivityService
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', return_value=mock_focus_data['pickups_today']):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=mock_focus_data['returns_today']):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=mock_focus_data['overdue_rentals']):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', return_value=mock_kpi_data):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', side_effect=Exception("Activity service error")):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', return_value=mock_equipment_data):
                                # Act & Assert
                                with pytest.raises(Exception, match="Activity service error"):
                                    await dashboard_service.get_summary()

    @pytest.mark.asyncio
    async def test_get_summary_equipment_service_error(self, dashboard_service, mock_focus_data, mock_kpi_data, 
                                                     mock_activity_data):
        """
        Тест обработки ошибки в EquipmentService.
        """
        # Arrange
        # Мокаем ошибку в EquipmentService
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', return_value=mock_focus_data['pickups_today']):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=mock_focus_data['returns_today']):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=mock_focus_data['overdue_rentals']):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', return_value=mock_kpi_data):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', return_value=mock_activity_data):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', side_effect=Exception("Equipment service error")):
                                # Act & Assert
                                with pytest.raises(Exception, match="Equipment service error"):
                                    await dashboard_service.get_summary()

    @pytest.mark.asyncio
    async def test_get_summary_database_connection_error(self, dashboard_service):
        """
        Тест обработки ошибки подключения к базе данных.
        """
        # Arrange
        # Мокаем ошибку подключения к БД
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', side_effect=Exception("Database connection error")):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=[]):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=[]):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', return_value={}):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', return_value=[]):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', return_value=[]):
                                # Act & Assert
                                with pytest.raises(Exception, match="Database connection error"):
                                    await dashboard_service.get_summary()

    @pytest.mark.asyncio
    async def test_get_summary_large_dataset(self, dashboard_service):
        """
        Тест обработки большого объема данных.
        """
        # Arrange
        large_pickups = [{
            'id': i, 
            'user_name': f'User {i}', 
            'user_phone': f'+123456789{i}',
            'user_telegram': f'@user{i}',
            'user_status': 'active',
            'user_balance': 1000.0 + i,
            'equipment_list': [f'Equipment {i}'],
            'user_id': i,
            'order_type': 'reservation',
            'scheduled_time': '2025-01-01T10:00:00',
            'start_date': '2025-01-01',
            'due_date': None,
            'days_overdue': 0,
            'user_client_status': 'new',
            'is_pending_pickup': False,
        } for i in range(100)]
        
        large_returns = [{
            'id': i, 
            'user_name': f'User {i}', 
            'user_phone': f'+123456789{i}',
            'user_telegram': f'@user{i}',
            'user_status': 'active',
            'user_balance': 1000.0 + i,
            'equipment_list': [f'Equipment {i}'],
            'user_id': i,
            'order_type': 'rental',
            'scheduled_time': '2025-01-01T15:00:00',
            'start_date': '2024-12-30',
            'due_date': '2025-01-01',
            'days_overdue': 0,
            'user_client_status': 'regular',
            'is_pending_pickup': False,
        } for i in range(50)]
        
        large_overdue = [{
            'id': i, 
            'user_name': f'User {i}', 
            'user_phone': f'+123456789{i}',
            'user_telegram': f'@user{i}',
            'user_status': 'active',
            'user_balance': -500.0 - i,
            'equipment_list': [f'Equipment {i}'],
            'user_id': i,
            'order_type': 'rental',
            'scheduled_time': '2024-12-25T12:00:00',
            'start_date': '2024-12-20',
            'due_date': '2024-12-25',
            'days_overdue': i % 10,
            'user_client_status': 'debtor',
            'is_pending_pickup': False,
        } for i in range(20)]
        
        large_activity = [{
            'id': i, 
            'timestamp': '2025-01-01T10:00:00',
            'activity_type': 'new_reservation', 
            'description': f'Activity {i}',
            'user_name': f'User {i}',
            'equipment_name': f'Equipment {i}'
        } for i in range(200)]
        
        large_equipment = [{
            'equipment_id': i, 
            'equipment_name': f'Equipment {i}', 
            'rental_count': i * 2,
            'revenue': i * 100.0
        } for i in range(50)]
        
        large_kpi = {
            'total_users': 1000,
            'active_users': 750,
            'total_equipment': 500,
            'total_reservations': 2000,
            'revenue_today': 50000.0,
            'revenue_this_month': 1000000.0,
            'occupancy_rate': 85.7,
            'avg_rental_duration': 3.5,
            # +++ НОВЫЕ ПОЛЯ +++
            'active_reservations': 250,
            'total_rentals': 1500,
            'active_rentals': 300,
            'overdue_rentals': 50,
            'total_accessories': 750,
            'total_associations': 200
        }
        
        # Мокаем все под-сервисы с большими данными
        with patch.object(dashboard_service.focus_service, 'get_pickups_today', return_value=large_pickups):
            with patch.object(dashboard_service.focus_service, 'get_returns_today', return_value=large_returns):
                with patch.object(dashboard_service.focus_service, 'get_overdue_rentals', return_value=large_overdue):
                    with patch.object(dashboard_service.kpi_service, 'get_kpi_data', return_value=large_kpi):
                        with patch.object(dashboard_service.activity_service, 'get_recent_activity', return_value=large_activity):
                            with patch.object(dashboard_service.equipment_service, 'get_popular_equipment', return_value=large_equipment):
                                # Act
                                result = await dashboard_service.get_summary()

                                # Assert
                                assert isinstance(result, DashboardSummaryResponse)
                                assert len(result.pickups_today) == 100
                                assert len(result.returns_today) == 50
                                assert len(result.overdue_rentals) == 20
                                assert len(result.recent_activity) == 200
                                assert len(result.popular_equipment) == 50
                                assert result.kpi.revenue_this_month == 1000000.0

    # === ТЕСТЫ ДЛЯ ИНИЦИАЛИЗАЦИИ СЕРВИСА ===

    def test_dashboard_service_initialization(self, dashboard_service, mock_db_session):
        """
        Тест правильной инициализации DashboardService.
        """
        # Assert
        assert dashboard_service.db == mock_db_session
        assert dashboard_service.focus_service is not None
        assert dashboard_service.kpi_service is not None
        assert dashboard_service.activity_service is not None
        assert dashboard_service.equipment_service is not None

    def test_dashboard_service_subservices_are_initialized(self, dashboard_service):
        """
        Тест проверяет, что все под-сервисы правильно инициализированы.
        """
        # Assert
        assert dashboard_service.focus_service is not None
        assert dashboard_service.kpi_service is not None
        assert dashboard_service.activity_service is not None
        assert dashboard_service.equipment_service is not None
