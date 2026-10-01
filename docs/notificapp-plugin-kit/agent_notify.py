"""Cliente independiente para avisos de Codex/Claude al espacio Agentes.

La credencial procede de un archivo privado del equipo, nunca del ZIP del plugin.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path


def send(payload: dict, url: str, token: str) -> None:
    request = urllib.request.Request(
        url.rstrip("/") + "/v1/events",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8",
                 "User-Agent": "Notificapp-Agent/1.0"},
    )
    with urllib.request.urlopen(request, timeout=10) as result:
        if result.status not in (200, 201):
            raise RuntimeError(f"HTTP {result.status}")


def pending_path(queue: Path, external_id: str) -> Path:
    return queue / (hashlib.sha256(external_id.encode("utf-8")).hexdigest() + ".json")


def deliver(payload: dict, url: str, token: str, queue: Path) -> bool:
    path = pending_path(queue, payload["externalId"])
    try:
        send(payload, url, token)
    except urllib.error.HTTPError as error:
        if error.code < 500:
            raise RuntimeError(f"Notificapp rechazó el aviso: HTTP {error.code}") from error
        queue.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        return False
    except (OSError, TimeoutError):
        queue.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        return False
    path.unlink(missing_ok=True)
    return True


def payload_for(body: str, kind: str, agent: str, external_id: str | None = None,
                title: str | None = None) -> dict:
    if not body:
        raise ValueError("El texto está vacío")
    heading = title if title is not None else (
        f"{agent} ha finalizado" if kind == "agent_finished" else f"{agent} necesita tu respuesta"
    )
    if not heading.strip() or len(heading) > 200:
        raise ValueError("El título debe tener entre 1 y 200 caracteres")
    return {
        "externalId": external_id or f"manual-{uuid.uuid4()}",
        "kind": kind,
        "title": heading,
        "body": body,
        "agent": agent,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=os.environ.get("NOTIFICAPP_URL", "https://notificapp-api.yosiftware.es"))
    parser.add_argument("--token-file", type=Path,
                        default=Path(os.environ.get("NOTIFICAPP_AGENT_TOKEN_FILE", "")) if os.environ.get("NOTIFICAPP_AGENT_TOKEN_FILE") else None)
    parser.add_argument("--queue", type=Path, default=Path.home() / ".notificapp" / "pending-agent")
    parser.add_argument("--agent", choices=["Codex", "Claude"], default="Codex")
    parser.add_argument("--kind", choices=["agent_finished", "agent_question"])
    parser.add_argument("--body-file", type=Path)
    parser.add_argument("--title", help="Título exacto del aviso; máximo 200 caracteres")
    parser.add_argument("--external-id")
    parser.add_argument("--codex-notify", action="store_true")
    parser.add_argument("--drain", action="store_true")
    parser.add_argument("notification", nargs="?")
    args = parser.parse_args()
    if not args.url.startswith("https://") or not args.token_file or not args.token_file.is_file():
        parser.error("Configura HTTPS y --token-file privado o NOTIFICAPP_AGENT_TOKEN_FILE")
    token = args.token_file.read_text(encoding="utf-8").strip()
    if not token:
        parser.error("Credencial vacía")
    try:
        if args.drain:
            count = 0
            for path in sorted(args.queue.glob("*.json")):
                payload = json.loads(path.read_text(encoding="utf-8"))
                if deliver(payload, args.url, token, args.queue):
                    count += 1
            print(f"Reenviados: {count}")
            return
        if args.codex_notify:
            if not args.notification:
                parser.error("Falta el JSON del evento de Codex")
            notice = json.loads(args.notification)
            if notice.get("type") != "agent-turn-complete":
                return
            thread, turn = notice.get("thread-id"), notice.get("turn-id")
            body = notice.get("last-assistant-message")
            if not thread or not turn or not body:
                return
            external_id = f"{thread}:{turn}"
            if len(external_id) > 128:
                external_id = hashlib.sha256(external_id.encode("utf-8")).hexdigest()
            title = args.title
            if title is None and isinstance(notice.get("cwd"), str):
                project = Path(notice["cwd"]).name.strip()[:80]
                if project:
                    title = f"{args.agent} ha finalizado en {project[:1].upper()}{project[1:]}"
            payload = payload_for(body, "agent_finished", args.agent, external_id, title)
        elif args.body_file and args.kind:
            payload = payload_for(args.body_file.read_text(encoding="utf-8"), args.kind, args.agent, args.external_id, args.title)
        else:
            parser.error("Indica --codex-notify o --body-file con --kind")
        accepted = deliver(payload, args.url, token, args.queue)
        if not args.codex_notify:
            print("Aceptado por Notificapp" if accepted else "Guardado para reintento")
    except (ValueError, RuntimeError, OSError) as error:
        parser.exit(2, f"Error: {error}\n")


if __name__ == "__main__":
    main()
