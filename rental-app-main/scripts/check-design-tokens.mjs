// scripts/check-design-tokens.mjs
//
// CI-гейт дизайн-системы (см. Docs/DESIGN_SYSTEM.md): CSS-файлы вне src/index.css
// не должны содержать цветов-литералов — только токены var(--…). В src/index.css
// литералы разрешены только внутри @media print (бланк — бумажный документ
// с фиксированной палитрой), вне его — только токены.
//
// Литералы в tsx/ts (hex, rgb/hsl без var, произвольные цветовые классы,
// размеры шрифта мимо шкалы) ловит eslint no-restricted-syntax в eslint.config.js.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = "src";
const TOKENS_FILE = "index.css";

// Убирает сбалансированный блок @media print { ... } из css-текста.
function stripMediaPrint(source) {
    const start = source.indexOf("@media print");
    if (start === -1) return source;
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i++) {
        if (source[i] === "{") depth++;
        if (source[i] === "}") {
            depth--;
            if (depth === 0) {
                return source.slice(0, start) + stripMediaPrint(source.slice(i + 1));
            }
        }
    }
    return source.slice(0, start);
}

// Цветовой литерал: hex, rgb()/rgba()/hsl()/hsla() с числовыми аргументами
// (hsl(var(--token) / …) — разрешён всегда).
const COLOR_LITERAL =
    /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*\d/;

function* walkCss(dir) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            yield* walkCss(full);
        } else if (entry.endsWith(".css")) {
            yield full;
        }
    }
}

const offenders = [];
for (const file of walkCss(SRC_DIR)) {
    let source = readFileSync(file, "utf8");
    if (file.replaceAll("\\", "/").endsWith(SRC_DIR + "/" + TOKENS_FILE)) {
        source = stripMediaPrint(source);
    }
    const lines = source.split("\n");
    lines.forEach((line, index) => {
        if (COLOR_LITERAL.test(line)) {
            offenders.push(`${file}:${index + 1}: ${line.trim()}`);
        }
    });
}

if (offenders.length > 0) {
    console.error("❌ Цветовые литералы в CSS вне токен-файла (src/index.css):");
    for (const offender of offenders) console.error(`   - ${offender}`);
    console.error("");
    console.error("Используй токены: var(--token), hsl(var(--token) / alpha).");
    console.error("Новый токен добавляй в :root и .dark в src/index.css (см. Docs/DESIGN_SYSTEM.md).");
    process.exit(1);
}

console.log("✅ check-design-tokens: CSS чист — все цвета через токены (печать-исключение учтено).");
