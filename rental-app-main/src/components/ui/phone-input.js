import { jsx as _jsx } from "react/jsx-runtime";
// src/components/ui/phone-input.tsx
import * as React from "react";
import { useIMask } from "react-imask";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
const PhoneInput = React.forwardRef(({ onChange, error, format = 'russian', className, ...props }, ref) => {
    // Определяем маску в зависимости от формата
    const maskConfig = format === 'russian'
        ? {
            mask: "+7 (000) 000-00-00",
            lazy: false,
            placeholderChar: '_'
        }
        : {
            mask: "+{1}(000)000-0000",
            lazy: false,
            placeholderChar: '_'
        };
    const { ref: imaskRef, value: maskedValue, setValue } = useIMask(maskConfig, {
        onAccept: (value) => {
            if (onChange) {
                // Создаем простое событие с необходимыми свойствами
                const event = {
                    target: {
                        name: props.name,
                        value: value,
                    },
                };
                onChange(event);
            }
        }
    });
    // Синхронизируем внешнее значение с маской
    React.useEffect(() => {
        const currentValue = props.value || '';
        if (currentValue !== maskedValue) {
            setValue(currentValue);
        }
    }, [props.value, maskedValue, setValue]);
    // Обработчик изменения значения
    const handleChange = React.useCallback((e) => {
        setValue(e.target.value);
    }, [setValue]);
    // Мемоизируем функцию установки refs для оптимизации
    const setRefs = React.useCallback((node) => {
        // Ref от useIMask
        imaskRef.current = node;
        // Внешний ref от react-hook-form
        if (typeof ref === 'function') {
            ref(node);
        }
        else if (ref) {
            ref.current = node;
        }
    }, [ref, imaskRef]);
    // Добавляем aria-атрибуты для лучшей доступности
    const accessibilityProps = {
        'aria-invalid': error ? true : false,
        'aria-describedby': error ? `${props.id}-error` : undefined,
        'inputMode': 'tel',
        'autoComplete': 'tel',
    };
    return (_jsx(Input, { ...props, ...accessibilityProps, ref: setRefs, value: maskedValue || '', onChange: handleChange, className: cn(error && "border-red-500 focus-visible:ring-red-500", className) }));
});
PhoneInput.displayName = "PhoneInput";
export { PhoneInput };
