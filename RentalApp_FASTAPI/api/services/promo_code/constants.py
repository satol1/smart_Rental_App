# api/services/promo_code/constants.py

from fastapi import status

# Сообщения об ошибках
ERROR_MESSAGES = {
    'NOT_FOUND': 'Промокод не найден',
    'INACTIVE': 'Промокод неактивен',
    'NOT_STARTED': 'Промокод еще не начал действовать',
    'EXPIRED': 'Срок действия промокода истек',
    'USAGE_LIMIT_EXCEEDED': 'Лимит использований этого промокода исчерпан',
    'MIN_ORDER_AMOUNT': 'Минимальная сумма заказа для этого кода: {amount} ₽',
    'INVALID_EQUIPMENT': 'Промокод не действует на выбранные товары',
    'INVALID_EQUIPMENT_TYPE': 'Промокод не действует на выбранные категории товаров',
    'PERSONAL_CODE_FORBIDDEN': 'Это персональный промокод для другого пользователя',
    'USER_USAGE_LIMIT': 'Вы уже использовали этот промокод максимальное количество раз',
    'CODE_EXISTS': 'Промокод с таким кодом уже существует',
    'EQUIPMENT_NOT_FOUND': 'Одно или несколько оборудований для промокода не найдены.',
    'MANAGER_DISCOUNT_LIMIT': 'Менеджеры не могут создавать скидку более 20%',
    'ADMIN_DISCOUNT_LIMIT': 'Администраторы не могут создавать скидку более 50%'
}

# Коды статусов HTTP
HTTP_STATUS_CODES = {
    'NOT_FOUND': status.HTTP_404_NOT_FOUND,
    'BAD_REQUEST': status.HTTP_400_BAD_REQUEST,
    'FORBIDDEN': status.HTTP_403_FORBIDDEN,
    'CONFLICT': status.HTTP_409_CONFLICT
}

# Лимиты скидок по ролям
DISCOUNT_LIMITS = {
    'manager': 20,
    'admin': 50
}

# Максимальный комбинированный процент скидки
MAX_COMBINED_DISCOUNT = 75 