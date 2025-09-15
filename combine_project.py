import os
import json
import fnmatch
from pathlib import Path
from collections import defaultdict
import re

# --- ОБЩАЯ КОНФИГУРАЦИЯ ---
# Определяем корень проекта относительно расположения этого скрипта
project_root = Path(__file__).resolve().parent
output_filename = project_root / "smart_project_summary.md"

# 1. ЧТО ВКЛЮЧАЕМ В СБОРКУ
# Директории для сканирования
INCLUDE_DIRS = {
    "RentalApp_FASTAPI",
    "rental-app-main",
    "nginx"
}
# Конкретные файлы в корне проекта
INCLUDE_FILES_IN_ROOT = {
    "docker-compose.yml",
    ".env"
}
# Расширения файлов, которые нужно включать
INCLUDE_EXTENSIONS = {
    ".py", ".tsx", ".ts", ".js", ".css", ".json", ".conf", ".yml", ".md"
}
# Файлы, которые всегда включаем, даже если у них нет расширения
ALWAYS_INCLUDE_FILENAMES = {
    "Dockerfile.backend",
    "Dockerfile.frontend"
}
# Файлы, для которых не нужно показывать содержимое, а только название
LIGHTWEIGHT_EXTENSIONS = {".svg"}


# 2. ЧТО ИСКЛЮЧАЕМ ИЗ СБОРКИ
# Директории, которые нужно полностью игнорировать
EXCLUDE_DIRS = {
    '.git', '.venv', '__pycache__', 'node_modules',
    '.idea', '.vscode', 'dist', 'build'
}
# Файлы, которые нужно игнорировать по маске
EXCLUDE_FILES = {
    '*.pyc', '*.pyo', '*.db', '*.sql', 'package-lock.json'
}

def collect_files_to_include():
    """Собирает список всех файлов для включения в итоговый документ."""
    included_files = []
    for root, dirs, files in os.walk(project_root, topdown=True):
        # Исключаем ненужные директории из дальнейшего обхода
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        current_dir_path = Path(root)

        for file in files:
            file_path = current_dir_path / file
            relative_path = file_path.relative_to(project_root)

            # Пропускаем файлы из исключенных директорий
            if any(part in EXCLUDE_DIRS for part in relative_path.parts):
                continue

            # Пропускаем файлы по маске
            if any(fnmatch.fnmatch(file, pattern) for pattern in EXCLUDE_FILES):
                continue

            # Проверяем, нужно ли включить файл
            is_in_included_dir = any(relative_path.parts[0] == d for d in INCLUDE_DIRS)
            is_root_file = relative_path.parent.name == '' and file in INCLUDE_FILES_IN_ROOT
            has_valid_extension = file_path.suffix in INCLUDE_EXTENSIONS or file_path.suffix in LIGHTWEIGHT_EXTENSIONS
            is_always_included = file in ALWAYS_INCLUDE_FILENAMES

            if is_in_included_dir or is_root_file:
                if has_valid_extension or is_always_included:
                    included_files.append(file_path)

    return sorted(included_files, key=lambda p: str(p.relative_to(project_root)))


def generate_tree_structure(included_files):
    """Создает текстовое представление иерархической структуры проекта."""
    tree = defaultdict(list)
    for path in included_files:
        rel_path = path.relative_to(project_root)
        parent_str = str(rel_path.parent)
        # Для корневых файлов используем специальный маркер
        parent_key = parent_str if parent_str != '.' else '/'
        tree[parent_key].append(rel_path)

    lines = ["# 📁 Структура проекта (иерархия)"]

    # Сначала выводим файлы в корне
    root_files = sorted(tree.get('/', []))
    lines.append(f"`{project_root.name}/`")

    # Рекурсивная функция для построения дерева
    def build_tree(folder: str, prefix: str = ""):
        # Получаем и сортируем подпапки
        subfolders = sorted([d for d in tree if Path(d).parent == Path(folder) and d != folder])

        # Обрабатываем подпапки
        for i, subfolder in enumerate(subfolders):
            is_last_subfolder = (i == len(subfolders) - 1)
            lines.append(f"{prefix}{'└── ' if is_last_subfolder else '├── '}`{Path(subfolder).name}/`")
            # Получаем файлы для этой подпапки
            folder_files = sorted(tree.get(subfolder, []))
            for j, file_path in enumerate(folder_files):
                is_last_file = (j == len(folder_files) - 1)
                file_prefix = prefix + ('    ' if is_last_subfolder else '│   ')
                icon = "📄"
                if file_path.suffix in LIGHTWEIGHT_EXTENSIONS: icon = "🖼️"
                if file_path.name.lower().startswith('docker'): icon = "🐳"
                lines.append(f"{file_prefix}{'└── ' if is_last_file else '├── '}{icon} `{file_path.name}`")

            # Рекурсивный вызов для вложенных папок
            build_tree(subfolder, prefix + ('    ' if is_last_subfolder else '│   '))

    # Выводим корневые файлы после корневой директории
    for i, file_path in enumerate(root_files):
        is_last = i == len(root_files) - 1 and all(p.parts[0] not in tree for p in included_files if len(p.parts) > 1)
        icon = "📄"
        if "docker-compose" in file_path.name: icon = "🐳"
        if ".env" in file_path.name: icon = "🤫"
        lines.append(f"├── {icon} `{file_path.name}`")

    # Строим дерево для всех включенных директорий
    included_root_dirs = sorted(list(INCLUDE_DIRS))
    for i, root_dir in enumerate(included_root_dirs):
        is_last_root = i == len(included_root_dirs) - 1
        lines.append(f"{'└── ' if is_last_root else '├── '}`{root_dir}/`")
        build_tree(root_dir, '    ' if is_last_root else '│   ')

    return "\n".join(lines)


def write_output_file(included_files):
    """Записывает собранный код, структуру и зависимости в итоговый markdown файл."""
    with open(output_filename, "w", encoding="utf-8") as out:
        out.write("# 🤖 Сжатый исходный код проекта для AI-помощника\n\n")

        # --- Секция навигации ---
        out.write("## 🔗 Быстрая навигация по файлам\n")
        for path in included_files:
            rel_path_str = path.relative_to(project_root).as_posix()
            anchor = re.sub(r'[^a-zA-Z0-9]', '', rel_path_str)
            out.write(f"- [{rel_path_str}](#{anchor})\n")
        out.write("\n---\n\n")

        # --- Секция структуры ---
        structure = generate_tree_structure(included_files)
        out.write(structure)
        out.write("\n\n---\n")

        # --- Секция с кодом ---
        for path in included_files:
            rel_path = path.relative_to(project_root)
            rel_path_str = rel_path.as_posix()
            anchor = re.sub(r'[^a-zA-Z0-9]', '', rel_path_str)
            out.write(f'\n\n## <a name="{anchor}"></a>`{rel_path_str}`\n\n')

            if path.suffix in LIGHTWEIGHT_EXTENSIONS:
                out.write(f"```\n[Содержимое SVG файла '{path.name}' не включено для экономии места]\n```\n")
                continue

            lang_map = {
                '.py': 'python', '.tsx': 'tsx', '.ts': 'typescript',
                '.css': 'css', '.js': 'javascript', '.json': 'json',
                '.yml': 'yaml', '.conf': 'nginx', '.md': 'markdown'
            }
            lang = lang_map.get(path.suffix, '')
            if path.name.lower().startswith('dockerfile'):
                lang = 'dockerfile'

            block = [f"```{lang}"]
            try:
                # Добавляем комментарий с путем к файлу для AI
                block.insert(1, f"// path: {rel_path_str}\n")
                content = path.read_text(encoding="utf-8")
                block.append(content)
            except Exception as e:
                block.append(f"# Ошибка чтения файла: {e}")
            block.append("\n```\n")
            out.write("\n".join(block))

        # --- Секция зависимостей ---
        out.write("\n\n## 📦 Зависимости проекта\n")
        # Frontend
        pkg_path = project_root / "rental-app-main" / "package.json"
        if pkg_path.exists():
            try:
                pkg_data = json.loads(pkg_path.read_text(encoding="utf-8"))
                deps = pkg_data.get("dependencies", {})
                dev_deps = pkg_data.get("devDependencies", {})
                out.write("\n### Frontend (package.json)\n\n")
                if deps:
                    for name, version in sorted(deps.items()):
                        out.write(f"- `{name}`: {version}\n")
                if dev_deps:
                    out.write("\n#### Dev-зависимости\n")
                    for name, version in sorted(dev_deps.items()):
                        out.write(f"- `{name}`: {version}\n")
            except Exception as e:
                out.write(f"\n\n## Ошибка чтения package.json: {e}\n")

        # Backend
        req_path = project_root / "RentalApp_FASTAPI" / "requirements.txt"
        if req_path.exists():
            try:
                out.write("\n### Backend (requirements.txt)\n\n")
                out.write("```txt\n")
                out.write(req_path.read_text(encoding="utf-8"))
                out.write("\n```\n")
            except Exception as e:
                out.write(f"\n\n## Ошибка чтения requirements.txt: {e}\n")


def main():
    """Главная функция для выполнения скрипта."""
    print("🤖 Собираю исходный код проекта для AI-помощника...")
    included_files = collect_files_to_include()
    print(f"Найдено {len(included_files)} файлов для включения в сборку.")
    write_output_file(included_files)
    print(f"✅ Готово! Файл '{output_filename.name}' успешно создан в корне вашего проекта.")


if __name__ == "__main__":
    main()