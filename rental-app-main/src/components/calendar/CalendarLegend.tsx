import { useTranslation } from 'react-i18next';

export function CalendarLegend() {
  const { t } = useTranslation();
  const statuses = [
    { surface: 'bg-pastel-mint', label: t('shell.available') },
    { surface: 'bg-pastel-amber', label: t('shell.reserved') },
    { surface: 'bg-pastel-coral', label: t('shell.rented') },
    { surface: 'bg-muted', label: t('shell.underRepair') },
  ];

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-muted-foreground">
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label={t('shell.calendarLegend')}>
        {statuses.map(({ surface, label }) => (
          <li key={label} className="flex items-center gap-2">
            <span className={`h-3.5 w-3.5 rounded border border-foreground/15 ${surface}`} aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs">{t('shell.ownEventLegend')}</p>
    </div>
  );
}
