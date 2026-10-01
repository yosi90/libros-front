"""Empaqueta el ejemplo o un template editado sin dependencias de Notificapp."""
from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--template", type=Path, default=Path(__file__).parent / "template")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = args.template / "manifest.json"
    html = args.template / "ui" / "index.html"
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if data.get("schemaVersion") != 1 or data.get("ui") != {"entry": "ui/index.html"}:
        parser.error("Manifiesto v1 o ruta de interfaz inválidos")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(manifest, "manifest.json")
        archive.write(html, "ui/index.html")
    raw = args.output.read_bytes()
    if len(raw) > 2 * 1024 * 1024:
        args.output.unlink()
        parser.error("ZIP mayor de 2 MiB")
    print(f"Paquete: {args.output.resolve()}")
    print(f"ID: {data['id']} · versión: {data['version']}")
    print(f"SHA-256: {hashlib.sha256(raw).hexdigest()}")


if __name__ == "__main__":
    main()
