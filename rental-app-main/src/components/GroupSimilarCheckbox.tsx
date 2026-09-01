import React from "react";
import { Checkbox } from "@/components/ui/checkbox"
import { useFilterStore } from "@/store/filterStore"
import { Label } from "@/components/ui/label"

function GroupSimilarCheckbox() {
  const groupSimilar = useFilterStore(state => state.groupSimilar);
  const setGroupSimilar = useFilterStore(state => state.setGroupSimilar);

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id="group-similar"
        checked={groupSimilar}
        onCheckedChange={(checked) => setGroupSimilar(Boolean(checked))}
      />
      <Label htmlFor="group-similar">Группировать одинаковые</Label>
    </div>
  )
}

GroupSimilarCheckbox.displayName = 'GroupSimilarCheckbox';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(GroupSimilarCheckbox);
