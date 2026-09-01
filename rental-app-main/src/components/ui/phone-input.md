# PhoneInput Component

Компонент для ввода телефонных номеров с автоматическим форматированием и валидацией.

## Особенности

- ✅ Автоматическое форматирование российских номеров (+7 (XXX) XXX-XX-XX)
- ✅ Поддержка международных номеров
- ✅ Валидация в реальном времени
- ✅ Совместимость с react-hook-form
- ✅ Доступность (ARIA атрибуты)
- ✅ Поддержка ошибок и состояний
- ✅ Мемоизация для оптимизации производительности

## Использование

### Базовое использование

```tsx
import { PhoneInput } from "@/components/ui/phone-input";

function MyForm() {
  const [phone, setPhone] = useState("");

  return (
    <PhoneInput
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      placeholder="+7 (___) ___-__-__"
    />
  );
}
```

### С react-hook-form

```tsx
import { useForm } from "react-hook-form";
import { PhoneInput } from "@/components/ui/phone-input";

function MyForm() {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <PhoneInput
        {...register("phone")}
        placeholder="+7 (___) ___-__-__"
      />
    </form>
  );
}
```

### С валидацией ошибок

```tsx
import { PhoneInput } from "@/components/ui/phone-input";

function MyForm() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(false);

  return (
    <PhoneInput
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      error={error}
      placeholder="+7 (___) ___-__-__"
    />
  );
}
```

### С react-hook-form и Zod валидацией

```tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PhoneInput } from "@/components/ui/phone-input";

const schema = z.object({
  phone: z.string().optional().refine(val => !val || /^[78]?\d{10}$/.test(val.replace(/[^\d]/g, '')), {
    message: "Некорректный формат номера. Используйте: +7 (XXX) XXX-XX-XX",
  }),
});

function MyForm() {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneInput
            {...field}
            error={!!errors.phone}
            placeholder="+7 (___) ___-__-__"
          />
        )}
      />
      {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
    </form>
  );
}
```

### Международный формат

```tsx
import { PhoneInput } from "@/components/ui/phone-input";

function MyForm() {
  const [phone, setPhone] = useState("");

  return (
    <PhoneInput
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      format="international"
      placeholder="+X (XXX) XXX-XXXX"
    />
  );
}
```

## Props

| Prop | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `value` | `string` | - | Значение поля |
| `onChange` | `(e: ChangeEvent<HTMLInputElement>) => void` | - | Обработчик изменения |
| `error` | `boolean` | `false` | Показывать ли ошибку |
| `format` | `'russian' \| 'international'` | `'russian'` | Формат номера |
| `className` | `string` | - | Дополнительные CSS классы |
| `placeholder` | `string` | - | Плейсхолдер |
| `disabled` | `boolean` | `false` | Отключено ли поле |
| `required` | `boolean` | `false` | Обязательное ли поле |

## События

Компонент генерирует стандартные события `ChangeEvent<HTMLInputElement>` с дополнительными данными в `target.dataset`:

- `isValid`: `boolean` - является ли номер полным и валидным
- `unmaskedValue`: `string` - номер без форматирования

## Валидация

Компонент использует встроенную валидацию через `react-imask` и интегрируется с Zod-схемами через react-hook-form:

- Автоматическое форматирование российских номеров
- Поддержка российских (+7) и международных номеров
- Интеграция с react-hook-form для валидации
- Отображение ошибок через проп `error`

## Доступность

Компонент включает следующие ARIA атрибуты:

- `aria-invalid`: указывает на наличие ошибки
- `aria-describedby`: связывает с сообщением об ошибке
- `inputMode="tel"`: показывает цифровую клавиатуру на мобильных устройствах
- `autoComplete="tel"`: помогает браузеру автозаполнить поле

## Интеграция с Zod

Для валидации телефонных номеров рекомендуется использовать Zod-схемы:

```tsx
import { z } from "zod";

const validateRussianPhone = (phone: string): boolean => {
  if (!phone) return true;
  const cleanPhone = phone.replace(/[^\d]/g, '');
  if (cleanPhone.length < 10) return false;
  return /^[78]?\d{10}$/.test(cleanPhone);
};

const phoneSchema = z.string().optional().refine(val => !val || validateRussianPhone(val), {
  message: "Некорректный формат номера. Используйте: +7 (XXX) XXX-XX-XX",
});
``` 