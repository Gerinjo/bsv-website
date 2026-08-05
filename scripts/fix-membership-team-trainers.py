from pathlib import Path

paths = [
    Path('src/pages/verein/mitglied-werden.astro'),
    Path('public/api/membership-v3.php'),
]

replacements = {
    "M. Sick, S. Sulger, H. Ho": "M. Sick, S. Sulger, Mar. Rüth",
    "M. Rüth, M. Mahmoudi": "Mic. Rüth, M. Mahmoudi",
}

for path in paths:
    source = path.read_text(encoding='utf-8')
    original = source
    for old, new in replacements.items():
        if old not in source:
            raise SystemExit(f'Expected trainer text not found in {path}: {old}')
        source = source.replace(old, new)
    path.write_text(source, encoding='utf-8')
    print(f'Updated {path}')
