// src/components/shared/UserSelector.tsx

import { useState } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import type { UserOut } from "@/types/user";
import { cn } from "@/lib/utils";

interface UserSelectorProps<TFieldValues extends FieldValues = FieldValues> {
  // Основные пропсы
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  placeholder?: string;

  // Данные
  users: UserOut[];
  isLoading: boolean;

  // Серверный поиск (передаётся наружу для debounce + запроса)
  search?: string;
  onSearchChange?: (value: string) => void;

  // Догрузка страниц (infinite query)
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  isFetchingNextPage?: boolean;

  // Валидация и ошибки
  error?: string;

  // Состояние
  disabled?: boolean;

  // Стилизация
  className?: string;
  popoverClassName?: string;
}

/**
 * Переиспользуемый компонент для выбора пользователя из списка.
 * Использует Command компонент для поиска и выбора.
 * Поддерживает серверный поиск (onSearchChange) и догрузку страниц (onLoadMore).
 */
export default function UserSelector<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  placeholder = "Выберите пользователя...",
  users,
  isLoading,
  search,
  onSearchChange,
  hasNextPage,
  onLoadMore,
  isFetchingNextPage,
  error,
  disabled = false,
  className,
  popoverClassName
}: UserSelectorProps<TFieldValues>) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  // Имя выбранного пользователя живёт дольше списка: после нового поиска выбранный
  // может не попасть в загруженную страницу — триггер не должен становиться пустым
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  // Локальный фильтр — только когда серверного поиска нет
  const visibleUsers = onSearchChange
    ? users
    : users.filter(user => `${user.full_name} ${user.email}`.toLowerCase().includes(localSearch.toLowerCase()));

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={name}>{label}</Label>

      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const triggerLabel = field.value
            ? (users.find(u => u.id === field.value)?.full_name ?? selectedName ?? placeholder)
            : placeholder;
          return (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                  disabled={isLoading || disabled}
                >
                  {triggerLabel}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", popoverClassName)}>
                <Command shouldFilter={!onSearchChange}>
                  <CommandInput
                    placeholder="Поиск по имени, email или телефону..."
                    value={search ?? localSearch}
                    onValueChange={handleSearchChange}
                  />
                  <CommandList>
                    <CommandEmpty>Пользователи не найдены.</CommandEmpty>
                    <CommandGroup>
                      {visibleUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.full_name} ${user.email}`}
                          onSelect={() => {
                            field.onChange(user.id);
                            setSelectedName(user.full_name);
                            setIsOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="flex-1 truncate">{user.full_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground truncate">{user.email}</span>
                        </CommandItem>
                      ))}
                      {onLoadMore && hasNextPage && (
                        <div className="p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-muted-foreground"
                            onClick={() => onLoadMore()}
                            disabled={isFetchingNextPage}
                          >
                            {isFetchingNextPage && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                            Показать ещё
                          </Button>
                        </div>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          );
        }}
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
