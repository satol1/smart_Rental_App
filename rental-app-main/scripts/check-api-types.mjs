// scripts/check-api-types.mjs
//
// CI-правило этапа 5.1: новые сервисы в src/core/services обязаны использовать
// сгенерированные типы API (импорт из @/types/api/schema или @/types/api/schemas).
// Существующие сервисы, ещё не мигрированные, перечислены в LEGACY_SERVICES;
// список должен только сокращаться. Новый сервис вне списка без импорта
// сгенерированных типов роняет проверку.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SERVICES_DIR = "src/core/services";

const LEGACY_SERVICES = new Set([
    "ReservationService.ts",
    "EquipmentService.ts",
    "UserService.ts",
    "AccessoryService.ts",
    "CalendarService.ts",
    "DateService.ts",
    "BrandSystemService.ts",
    "RentalService.ts",
    "AvailabilityService.ts",
    "HolidayService.ts",
    "PeriodService.ts",
    "cookieConsentManager.ts",
    "tokenManager.ts",
]);

const GENERATED_TYPES_IMPORT = /from\s+["']@\/types\/api\/(schema|schemas)["']/;

const files = readdirSync(SERVICES_DIR).filter(
    (file) => file.endsWith(".ts") && file !== "index.ts",
);

// «Список только сокращается»: устаревшая легаси-запись (файл удалён/переименован) — ошибка
const staleLegacy = [...LEGACY_SERVICES].filter((file) => !files.includes(file));
if (staleLegacy.length > 0) {
    console.error("❌ LEGACY_SERVICES содержит несуществующие файлы (удали их из списка):");
    for (const file of staleLegacy) console.error(`   - ${file}`);
    process.exit(1);
}

const offenders = [];
for (const file of files) {
    if (LEGACY_SERVICES.has(file)) continue;
    const source = readFileSync(join(SERVICES_DIR, file), "utf8");
    if (!GENERATED_TYPES_IMPORT.test(source)) {
        offenders.push(file);
    }
}

if (offenders.length > 0) {
    console.error("❌ Сервисы без сгенерированных типов API (этап 5.1 плана аудита):");
    for (const file of offenders) {
        console.error(`   - ${file}`);
    }
    console.error("");
    console.error("Новые сервисы должны импортировать типы из @/types/api/schemas (см. AuthService).");
    console.error("Если это осознанное исключение — добавь файл в LEGACY_SERVICES в scripts/check-api-types.mjs.");
    process.exit(1);
}

const migrated = files.filter(
    (file) => !LEGACY_SERVICES.has(file) || GENERATED_TYPES_IMPORT.test(readFileSync(join(SERVICES_DIR, file), "utf8")),
).length;
console.log(`✅ check-api-types: ${migrated}/${files.length} сервисов на сгенерированных типах (легаси: ${files.length - migrated}).`);
