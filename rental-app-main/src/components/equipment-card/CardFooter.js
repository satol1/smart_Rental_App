import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import AvailabilityStrip from "@/components/AvailabilityStrip";
import { STATUS_TEXT_STYLES, STATUS_TEXTS } from './constants';
export const CardFooter = ({ status, dateRange, selected, onToggleSelection, isUnavailable, dailyStatus, onSetStartDate }) => (_jsxs("div", { className: "mt-auto pt-4 space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("p", { className: `text-sm font-semibold ${STATUS_TEXT_STYLES[status]}`, children: [STATUS_TEXTS[status], dateRange && _jsx("span", { className: "ml-1 text-xs font-normal", children: dateRange })] }), (status === 'available' || status === 'added') && (_jsx("button", { onClick: onToggleSelection, disabled: isUnavailable, className: `px-3 py-1 rounded text-sm font-medium transition ${isUnavailable
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : status === 'added'
                            ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                            : selected
                                ? "bg-sky-700 text-white hover:bg-sky-800"
                                : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`, children: isUnavailable ? "Недоступно" : (status === 'added' ? "Отменить" : (selected ? "✔ В резерве" : "➕ В резерв")) }))] }), _jsx(AvailabilityStrip, { dailyStatus: dailyStatus, isUnavailable: isUnavailable, onSetStartDate: onSetStartDate })] }));
