// src/components/ui/phone-input.tsx

import * as React from "react";
import { useIMask } from "react-imask";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Упрощенная типизация для "глупого" компонента
interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    error?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // Поддержка различных форматов телефонов
    format?: 'russian' | 'international';
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ 
        onChange, 
        error, 
        format = 'russian',
        className,
        ...props 
    }, ref) => {
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

        const { ref: imaskRef, value: maskedValue, setValue } = useIMask(
            maskConfig,
            {
                onAccept: (value: any, mask: any) => {
                    if (onChange) {
                        // Создаем простое событие с необходимыми свойствами
                        const event = {
                            target: {
                                name: props.name,
                                value: value,
                            },
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        
                        onChange(event);
                    }
                }
            }
        );

        // Синхронизируем внешнее значение с маской
        React.useEffect(() => {
            const currentValue = props.value as string || '';
            if (currentValue !== maskedValue) {
                setValue(currentValue);
            }
        }, [props.value, maskedValue, setValue]);

        // Обработчик изменения значения
        const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            setValue(e.target.value);
        }, [setValue]);

        // Мемоизируем функцию установки refs для оптимизации
        const setRefs = React.useCallback(
            (node: HTMLInputElement | null) => {
                // Ref от useIMask
                (imaskRef as React.MutableRefObject<HTMLInputElement | null>).current = node;

                // Внешний ref от react-hook-form
                if (typeof ref === 'function') {
                    ref(node);
                } else if (ref) {
                    ref.current = node;
                }
            },
            [ref, imaskRef]
        );

        // Добавляем aria-атрибуты для лучшей доступности
        const accessibilityProps = {
            'aria-invalid': error ? true : false,
            'aria-describedby': error ? `${props.id}-error` : undefined,
            'inputMode': 'tel' as const,
            'autoComplete': 'tel' as const,
        };

        return (
            <Input
                {...props}
                {...accessibilityProps}
                ref={setRefs}
                value={maskedValue || ''}
                onChange={handleChange}
                className={cn(
                    error && "border-red-500 focus-visible:ring-red-500",
                    className
                )}
            />
        );
    }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
export type { PhoneInputProps };