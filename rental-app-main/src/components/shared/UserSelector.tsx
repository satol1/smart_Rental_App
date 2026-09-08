// src/components/shared/UserSelector.tsx

import { useState } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
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
 */
export default function UserSelector<TFieldValues extends FieldValues = FieldValues>({
  name,
  control,
  label,
  placeholder = "Выберите пользователя...",
  users,
  isLoading,
  error,
  disabled = false,
  className,
  popoverClassName
}: UserSelectorProps<TFieldValues>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={name}>{label}</Label>
      
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                role="combobox" 
                className="w-full justify-between" 
                disabled={isLoading || disabled}
              >
                {field.value ? users.find(u => u.id === field.value)?.full_name : placeholder}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", popoverClassName)}>
              <Command>
                <CommandInput placeholder="Поиск пользователя..." />
                <CommandList>
                  <CommandEmpty>Пользователи не найдены.</CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem 
                        key={user.id} 
                        value={`${user.full_name} ${user.email}`} 
                        onSelect={() => { 
                          field.onChange(user.id); 
                          setIsOpen(false); 
                        }}
                      >
                        <Check 
                          className={cn(
                            "mr-2 h-4 w-4", 
                            field.value === user.id ? "opacity-100" : "opacity-0"
                          )} 
                        />
                        {user.full_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      />
      
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
