import React from "react";
import { Checkbox } from "@/components/ui/checkbox"
import { useFilterStore } from "@/store/filterStore"
import { Label } from "@/components/ui/label"
import { useTranslation } from 'react-i18next';

function AvailableCheckbox() {
  const { t } = useTranslation();
  const availableOnly = useFilterStore(state => state.availableOnly);
  const setAvailableOnly = useFilterStore(state => state.setAvailableOnly);

  return (
    <div className="flex min-h-11 items-center space-x-2 px-1">
      <Checkbox
        id="available-only"
        checked={availableOnly}
        onCheckedChange={(checked) => setAvailableOnly(Boolean(checked))}
      />
      <Label htmlFor="available-only" className="cursor-pointer py-3 font-normal">{t('catalogDesign.onlyAvailable')}</Label>
    </div>
  )
}

AvailableCheckbox.displayName = 'AvailableCheckbox';

// Мемоизированная версия компонента для оптимизации производительности
export default React.memo(AvailableCheckbox);
