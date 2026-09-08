

const LegendItem = ({ colorClass, label }: { colorClass: string, label: string }) => (
    <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded ${colorClass}`}></div>
        <span className="text-sm">{label}</span>
    </div>
);

export function CalendarLegend() {
    return (
        <div className="flex flex-wrap gap-x-6 gap-y-2 p-4 bg-white rounded-lg border shadow-sm mb-4">
            <LegendItem colorClass="bg-emerald-100" label="Свободно" />
            <LegendItem colorClass="bg-amber-200" label="Резерв (другие)" />
            <LegendItem colorClass="bg-amber-400" label="Мой резерв" />
            <LegendItem colorClass="bg-rose-200" label="Аренда (другие)" />
            <LegendItem colorClass="bg-rose-400" label="Моя аренда" />
            <LegendItem colorClass="bg-gray-200" label="На ремонте" />
        </div>
    );
}
