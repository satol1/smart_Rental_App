import asyncio
from containers import AsyncSessionLocal
from sqlalchemy import text

async def check_tables():
    async with AsyncSessionLocal() as db:
        try:
            # Получаем список всех таблиц
            result = await db.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"))
            tables = result.fetchall()
            
            print('Существующие таблицы:')
            for table in tables:
                print(f'  - {table[0]}')
                
            # Проверяем конкретно security_audit_logs
            security_result = await db.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_audit_logs')"))
            exists = security_result.scalar()
            print(f'\nТаблица security_audit_logs существует: {exists}')
            
        except Exception as e:
            print(f'Ошибка: {e}')

if __name__ == "__main__":
    asyncio.run(check_tables())