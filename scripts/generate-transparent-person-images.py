#!/usr/bin/env python3
"""Create transparent PNG cutouts for new or changed person photos."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile


MODEL_NAME = "isnet-general-use"
MANIFEST_VERSION = 1
SOURCE_EXTENSIONS = {".jpg", ".jpeg"}
SKIPPED_STEMS = {"platzhalter"}


def parse_args() -> argparse.Namespace:
    repository_root = Path(__file__).resolve().parent.parent
    default_source = repository_root / "public/images/verein/personen"

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, default=default_source)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report pending cutouts without changing files.",
    )
    parser.add_argument(
        "--record-existing",
        action="store_true",
        help="Record hashes for already existing, valid cutouts without regenerating them.",
    )
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_images(source_dir: Path) -> list[Path]:
    images = sorted(
        path
        for path in source_dir.iterdir()
        if path.is_file()
        and path.suffix.lower() in SOURCE_EXTENSIONS
        and path.stem.lower() not in SKIPPED_STEMS
    )

    stems: dict[str, Path] = {}
    for image in images:
        normalized_stem = image.stem.lower()
        if normalized_stem in stems:
            raise RuntimeError(
                f"Duplicate image stem: {stems[normalized_stem].name} and {image.name}"
            )
        stems[normalized_stem] = image
    return images


def output_path(source: Path, output_dir: Path) -> Path:
    return output_dir / f"{source.stem}-transparent.png"


def read_manifest(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("version") != MANIFEST_VERSION or data.get("model") != MODEL_NAME:
        return {}
    sources = data.get("sources")
    return sources if isinstance(sources, dict) else {}


def validate_cutout(source: Path, cutout: Path) -> None:
    from PIL import Image

    with Image.open(source) as original, Image.open(cutout) as result:
        if result.format != "PNG" or result.mode != "RGBA":
            raise RuntimeError(f"{cutout.name} is not an RGBA PNG")
        if result.size != original.size:
            raise RuntimeError(
                f"{cutout.name} has size {result.size}, expected {original.size}"
            )

        alpha = result.getchannel("A")
        minimum, maximum = alpha.getextrema()
        if minimum > 32 or maximum < 200:
            raise RuntimeError(f"{cutout.name} has no plausible transparent foreground mask")

        histogram = alpha.histogram()
        pixels = result.width * result.height
        transparent_share = sum(histogram[:33]) / pixels
        visible_share = sum(histogram[200:]) / pixels
        if transparent_share < 0.02 or visible_share < 0.02:
            raise RuntimeError(
                f"{cutout.name} failed alpha coverage validation "
                f"(transparent={transparent_share:.1%}, visible={visible_share:.1%})"
            )


def write_manifest(path: Path, hashes: dict[str, str]) -> None:
    payload = {
        "version": MANIFEST_VERSION,
        "model": MODEL_NAME,
        "sources": dict(sorted(hashes.items())),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", delete=False
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    os.replace(temporary_path, path)


def generate_cutout(source: Path, destination: Path, session: object) -> None:
    from PIL import Image
    from rembg import remove

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_name(f".{destination.stem}.tmp.png")
    try:
        with Image.open(source) as original:
            result = remove(original.convert("RGB"), session=session)
            result.save(temporary, format="PNG", optimize=True)
        validate_cutout(source, temporary)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> int:
    args = parse_args()
    source_dir = args.source_dir.resolve()
    output_dir = (args.output_dir or source_dir / "transparent").resolve()
    manifest_path = output_dir / ".source-hashes.json"

    if not source_dir.is_dir():
        print(f"Source directory does not exist: {source_dir}", file=sys.stderr)
        return 2

    images = source_images(source_dir)
    recorded = read_manifest(manifest_path)
    current = {image.name: sha256(image) for image in images}
    pending = [
        image
        for image in images
        if recorded.get(image.name) != current[image.name]
        or not output_path(image, output_dir).exists()
    ]

    if args.check:
        if pending:
            print("Pending cutouts: " + ", ".join(image.name for image in pending))
            return 1
        print(f"All {len(images)} person cutouts are current.")
        return 0

    if args.record_existing:
        missing = []
        for image in images:
            cutout = output_path(image, output_dir)
            if not cutout.exists():
                missing.append(cutout.name)
                continue
            validate_cutout(image, cutout)
        if missing:
            print("Missing cutouts: " + ", ".join(missing), file=sys.stderr)
            return 1
        write_manifest(manifest_path, current)
        print(f"Recorded {len(images)} existing person cutouts.")
        return 0

    if pending:
        from rembg import new_session

        print(f"Generating {len(pending)} person cutout(s) with {MODEL_NAME}...")
        session = new_session(MODEL_NAME)
        for index, image in enumerate(pending, start=1):
            destination = output_path(image, output_dir)
            print(f"[{index}/{len(pending)}] {image.name} -> {destination.name}")
            generate_cutout(image, destination, session)
    else:
        print(f"All {len(images)} person cutouts are already current.")

    write_manifest(manifest_path, current)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
