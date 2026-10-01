"""Envía una actualización de un plugin ya aprobado y autorizado."""
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
import zipfile
from pathlib import Path


USER_AGENT = "Notificapp-Publisher/1.0"


def describe_rejection(error: urllib.error.HTTPError) -> str:
    body = error.read(4096)
    content_type = error.headers.get("Content-Type", "").lower()
    if "json" in content_type:
        try:
            detail = json.loads(body.decode("utf-8")).get("detail")
        except (UnicodeError, ValueError, AttributeError):
            detail = None
        explanation = detail if isinstance(detail, str) and detail else "Comprueba el ID, la versión y el permiso del plugin."
        return f"Rechazado por la API de Notificapp (HTTP {error.code}): {explanation}"
    html = body.decode("utf-8", "replace").lower()
    if "1010" in html and ("cloudflare" in html or
                           "cloudflare" in error.headers.get("Server", "").lower() or
                           error.headers.get("Cf-Ray")):
        return f"Bloqueado por Cloudflare antes de llegar a Notificapp (HTTP {error.code}, error 1010)."
    return f"Respuesta no JSON antes de la API de Notificapp (HTTP {error.code})."


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="URL HTTPS de la API de Notificapp")
    parser.add_argument("--id", required=True, help="ID estable del plugin")
    parser.add_argument("--token-file", type=Path, required=True)
    parser.add_argument("package", type=Path)
    args = parser.parse_args()
    if not args.url.startswith("https://"):
        parser.error("La API debe usar HTTPS")
    with zipfile.ZipFile(args.package) as archive:
        manifest = json.loads(archive.read("manifest.json"))
    if manifest.get("id") != args.id:
        parser.error("El ID del ZIP no coincide con --id")
    token = args.token_file.read_text(encoding="utf-8").strip()
    if not token:
        parser.error("Credencial de actualización vacía")
    data = args.package.read_bytes()
    if len(data) > 2 * 1024 * 1024:
        parser.error("ZIP mayor de 2 MiB")
    request = urllib.request.Request(
        args.url.rstrip("/") + f"/v1/plugins/{args.id}/updates", data=data, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/zip",
                 "User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            print(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        parser.exit(2, describe_rejection(error) + "\n")
    except urllib.error.URLError:
        parser.exit(2, "No se pudo conectar con Notificapp por HTTPS.\n")


if __name__ == "__main__":
    main()
