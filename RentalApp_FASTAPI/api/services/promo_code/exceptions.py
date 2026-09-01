# api/services/promo_code/exceptions.py

from fastapi import HTTPException
from .constants import ERROR_MESSAGES, HTTP_STATUS_CODES


class PromoCodeException(HTTPException):
    """Базовое исключение для промокодов"""
    pass


class PromoCodeNotFoundError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['NOT_FOUND'],
            detail=ERROR_MESSAGES['NOT_FOUND']
        )


class PromoCodeInactiveError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['INACTIVE']
        )


class PromoCodeNotStartedError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['NOT_STARTED']
        )


class PromoCodeExpiredError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['EXPIRED']
        )


class PromoCodeUsageLimitExceededError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['USAGE_LIMIT_EXCEEDED']
        )


class PromoCodeMinOrderAmountError(PromoCodeException):
    def __init__(self, min_amount: float):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['MIN_ORDER_AMOUNT'].format(amount=min_amount)
        )


class PromoCodeInvalidEquipmentError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['INVALID_EQUIPMENT']
        )


class PromoCodeInvalidEquipmentTypeError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['INVALID_EQUIPMENT_TYPE']
        )


class PromoCodePersonalCodeForbiddenError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['FORBIDDEN'],
            detail=ERROR_MESSAGES['PERSONAL_CODE_FORBIDDEN']
        )


class PromoCodeUserUsageLimitError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['BAD_REQUEST'],
            detail=ERROR_MESSAGES['USER_USAGE_LIMIT']
        )


class PromoCodeExistsError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['CONFLICT'],
            detail=ERROR_MESSAGES['CODE_EXISTS']
        )


class PromoCodeEquipmentNotFoundError(PromoCodeException):
    def __init__(self):
        super().__init__(
            status_code=HTTP_STATUS_CODES['NOT_FOUND'],
            detail=ERROR_MESSAGES['EQUIPMENT_NOT_FOUND']
        )


class PromoCodeDiscountLimitError(PromoCodeException):
    def __init__(self, role: str):
        message_key = f'{role.upper()}_DISCOUNT_LIMIT'
        super().__init__(
            status_code=HTTP_STATUS_CODES['FORBIDDEN'],
            detail=ERROR_MESSAGES[message_key]
        ) 