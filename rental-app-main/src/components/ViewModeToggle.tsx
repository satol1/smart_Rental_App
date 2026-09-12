// src/components/ViewModeToggle.tsx

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List } from "lucide-react";
// Импортируем обновленный стор
import { useViewModeStore, type ViewMode } from "@/store/viewModeStore";

export default function ViewModeToggle() {
  // Используем новые методы из стора
  const { viewMode, setViewMode } = useViewModeStore();

  return (
      <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value: ViewMode) => {
            // Проверяем, что значение не пустое, прежде чем обновлять стор
            if (value) setViewMode(value);
          }}
          className="flex items-center"
          aria-label="Переключатель вида карточек"
      >
        <ToggleGroupItem value="default" aria-label="Стандартный вид" className="p-2 h-11 w-11">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="compact" aria-label="Компактный вид" className="p-2 h-11 w-11">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
  );
}