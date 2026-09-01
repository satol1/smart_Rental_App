import React from "react";
import { Checkbox } from "@/components/ui/checkbox"
import { useFilterStore } from "@/store/filterStore"
import { Label } from "@/components/ui/label"

function AvailableCheckbox() {
  const availableOnly = useFilterStore(state => state.availableOnly);
  const setAvailableOnly = useFilterStore(state => state.setAvailableOnly);

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="available-only"
        checked={availableOnly}
        onCheckedChange={(checked) => setAvailableOnly(Boolean(checked))}
      />
      <Label htmlFor="available-only">Только доступное</Label>
    </div>
  )
}

AvailableCheckbox.displayName = 'AvailableCheckbox';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AvailableCheckbox);
