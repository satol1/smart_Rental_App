// src/lib/equipmentTypeIcons.ts

import {
    Camera,
    Aperture,
    Video,
    Lightbulb,
    Mic,
    Headphones,
    Laptop,
    Package,
    Snowflake,
    Footprints,
    ShieldCheck,
    Mountain,
    type LucideIcon,
} from "lucide-react";

/**
 * Иконка для типа оборудования каталога.
 * Матчинг по подстрокам (регистронезависимо), потому что названия типов приходят
 * из данных и варьируются («Фотокамеры», «Камера», «Видеокамеры и экшн-камеры»...).
 * Порядок правил важен: более специфичные ключи — раньше.
 */
const TYPE_ICON_RULES: Array<{ pattern: RegExp; Icon: LucideIcon }> = [
    { pattern: /видеокамер|экшн/i, Icon: Video },
    { pattern: /фотокамер|камер|фото/i, Icon: Camera },
    { pattern: /объектив/i, Icon: Aperture },
    { pattern: /свет|освет/i, Icon: Lightbulb },
    { pattern: /микрофон/i, Icon: Mic },
    { pattern: /звук|аудио/i, Icon: Headphones },
    { pattern: /штатив|статив/i, Icon: Package },
    { pattern: /компьютер|ноутбук/i, Icon: Laptop },
    // Зимний инвентарь (на случай расширения каталога)
    { pattern: /лыж/i, Icon: Snowflake },
    { pattern: /сноуборд/i, Icon: Mountain },
    { pattern: /ботинк/i, Icon: Footprints },
    { pattern: /шлем|защит/i, Icon: ShieldCheck },
];

const FALLBACK_ICON = Package;

export function getEquipmentTypeIcon(type: string | null | undefined): LucideIcon {
    if (!type) return FALLBACK_ICON;
    const rule = TYPE_ICON_RULES.find(({ pattern }) => pattern.test(type));
    return rule ? rule.Icon : FALLBACK_ICON;
}
