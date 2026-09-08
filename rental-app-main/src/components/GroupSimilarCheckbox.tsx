import React from "react";
import { Checkbox } from "@/components/ui/checkbox"
import { useFilterStore } from "@/store/filterStore"
import { Label } from "@/components/ui/label"
import { useTranslation } from 'react-i18next';

function GroupSimilarCheckbox() {
  const { t } = useTranslation();
  const groupSimilar = useFilterStore(state => state.groupSimilar);
  const setGroupSimilar = useFilterStore(state => state.setGroupSimilar);

  return (
    <div className="flex min-h-11 items-center space-x-2">
      <Checkbox
        id="group-similar"
        checked={groupSimilar}
        onCheckedChange={(checked) => setGroupSimilar(Boolean(checked))}
      />
      <Label htmlFor="group-similar" className="cursor-pointer py-3 font-normal">{t('catalogDesign.groupSimilar')}</Label>
    </div>
  )
}

GroupSimilarCheckbox.displayName = 'GroupSimilarCheckbox';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(GroupSimilarCheckbox);
