"""Genera la página pública de la política de privacidad de Libros (`src/legal/privacidad/index.html`).

La fuente es el Markdown de la API: `../Libros API/docs/legal/PRIVACIDAD_LIBROS_V1.md` (o el que se pase). Se sirve
estática en `libros.yosiftware.es/privacidad/`, sin la aplicación ni la sesión, para que se pueda leer antes de
instalar la app (kit 1.88). Solo entiende lo que usa ese texto: títulos, párrafos, listas (con un nivel de anidado),
tablas, enlaces, negrita y código. Sin dependencias.

    py -3 scripts/legal/privacidad.py [ruta del Markdown]
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
FUENTE = RAIZ.parent / "Libros API" / "docs" / "legal" / "PRIVACIDAD_LIBROS_V1.md"
DESTINO = RAIZ / "src" / "legal" / "privacidad" / "index.html"
# La paleta sale de los tokens Web, porque la página se abre en el navegador (`GUIA_ESTILOS.md`: «no duplican la paleta»).
TOKENS = RAIZ / "src" / "assets" / "css" / "web" / "_tokens.sass"
COLORES = {"papel": "surface", "lienzo": "canvas", "tinta": "ink", "suave": "ink-muted", "acento": "primary",
           "borde": "outline"}


def paleta(mixin: str) -> str:
    """Las variables de la página con los valores de `--web-color-*` del mixin de `_tokens.sass`."""
    bloques = {b.splitlines()[0].strip(): b for b in TOKENS.read_text(encoding="utf-8").split("@mixin ")[1:]}
    if mixin not in bloques:
        raise SystemExit(f"{TOKENS.relative_to(RAIZ)}: falta el mixin {mixin}")
    valores = dict(re.findall(r"--web-color-([\w-]+):[ \t]*(\S.*)", bloques[mixin]))
    return " ".join(f"--{nombre}: {valores[token].strip()};" for nombre, token in COLORES.items())


def en_linea(texto: str) -> str:
    partes = re.split(r"(`[^`]+`)", texto)
    salida = []
    for parte in partes:
        if parte.startswith("`") and parte.endswith("`") and len(parte) > 1:
            salida.append(f"<code>{html.escape(parte[1:-1])}</code>")
            continue
        parte = html.escape(parte, quote=False)
        parte = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)",
                       lambda m: f'<a href="{html.escape(m.group(2))}" rel="noopener">{m.group(1)}</a>', parte)
        parte = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", parte)
        parte = re.sub(r"(?<![\"'>=/])(https?://[^\s<)]+[^\s<).,;])", r'<a href="\1" rel="noopener">\1</a>', parte)
        parte = re.sub(r"(?<![\w.@])(privacidad@yosiftware\.es)", r'<a href="mailto:\1">\1</a>', parte)
        salida.append(parte)
    return "".join(salida)


def celdas(linea: str) -> list[str]:
    return [c.strip() for c in linea.strip().strip("|").split("|")]


def convertir(markdown: str) -> tuple[str, str]:
    markdown = re.sub(r"<!--.*?-->", "", markdown, flags=re.S)
    lineas = markdown.splitlines()
    cuerpo: list[str] = []
    titulo = "Política de privacidad de Libros"
    i = 0
    while i < len(lineas):
        linea = lineas[i]
        if not linea.strip():
            i += 1
            continue
        cabecera = re.match(r"^(#{1,3}) (.+)$", linea)
        if cabecera:
            nivel = len(cabecera.group(1))
            if nivel == 1:
                titulo = cabecera.group(2).strip()
            cuerpo.append(f"<h{nivel}>{en_linea(cabecera.group(2).strip())}</h{nivel}>")
            i += 1
            continue
        if linea.startswith("|") and i + 1 < len(lineas) and re.match(r"^\|[\s:|-]+\|$", lineas[i + 1].strip()):
            encabezado = celdas(linea)
            i += 2
            filas = []
            while i < len(lineas) and lineas[i].startswith("|"):
                filas.append(celdas(lineas[i]))
                i += 1
            th = "".join(f"<th scope=\"col\">{en_linea(c)}</th>" for c in encabezado)
            tr = "".join("<tr>" + "".join(f"<td>{en_linea(c)}</td>" for c in fila) + "</tr>" for fila in filas)
            cuerpo.append(f'<div class="tabla"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>')
            continue
        if re.match(r"^- ", linea):
            items: list[tuple[str, list[str]]] = []
            while i < len(lineas) and re.match(r"^(  )?- ", lineas[i]):
                if lineas[i].startswith("  - "):
                    items[-1][1].append(lineas[i][4:])
                else:
                    items.append((lineas[i][2:], []))
                i += 1
            partes = []
            for texto, hijos in items:
                sub = "".join(f"<li>{en_linea(h)}</li>" for h in hijos)
                partes.append(f"<li>{en_linea(texto)}{f'<ul>{sub}</ul>' if sub else ''}</li>")
            cuerpo.append(f"<ul>{''.join(partes)}</ul>")
            continue
        parrafo = [linea.strip()]
        i += 1
        while i < len(lineas) and lineas[i].strip() and not re.match(r"^(#{1,3} |\||- )", lineas[i]):
            parrafo.append(lineas[i].strip())
            i += 1
        cuerpo.append(f"<p>{en_linea(' '.join(parrafo))}</p>")
    return titulo, "\n".join(cuerpo)


PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{titulo}</title>
<meta name="description" content="Qué datos trata Libros, en la web y en la app, para qué y durante cuánto tiempo.">
<link rel="icon" href="/favicon.ico">
<link rel="stylesheet" href="/assets/fonts/fuentes.css">
<style>
:root {{ color-scheme: light dark; {claro} }}
@media (prefers-color-scheme: dark) {{ :root {{ {oscuro} }} }}
* {{ box-sizing: border-box; }}
html {{ background: var(--lienzo); }}
body {{ margin: 0; color: var(--tinta); background: var(--papel); font: 400 1rem/1.65 Roboto, system-ui, sans-serif; max-inline-size: 52rem; margin-inline: auto; padding: 2rem clamp(1rem, 4vw, 3rem) 4rem; min-block-size: 100dvh; }}
h1, h2, h3 {{ font-family: Literata, Georgia, serif; font-weight: 600; line-height: 1.25; text-wrap: balance; }}
h1 {{ font-size: clamp(1.6rem, 5vw, 2.2rem); margin: 0 0 .25rem; }}
h1 + p {{ color: var(--suave); margin-top: 0; }}
h2 {{ font-size: 1.35rem; margin: 2.5rem 0 .75rem; }}
h3 {{ font-size: 1.1rem; margin: 2rem 0 .5rem; }}
p, li {{ max-inline-size: 72ch; }}
a {{ color: var(--acento); text-underline-offset: .15em; }}
code {{ font: .9em/1.4 ui-monospace, Consolas, monospace; background: var(--lienzo); padding: .05em .3em; border-radius: 4px; overflow-wrap: anywhere; }}
ul {{ padding-inline-start: 1.25rem; }}
.tabla {{ overflow-x: auto; margin: 1rem 0; border: 1px solid var(--borde); border-radius: 8px; }}
table {{ border-collapse: collapse; inline-size: 100%; font-size: .92rem; }}
th, td {{ text-align: start; vertical-align: top; padding: .6rem .75rem; border-block-end: 1px solid var(--borde); min-inline-size: 9rem; }}
th {{ background: var(--lienzo); font-weight: 600; }}
tr:last-child td {{ border-block-end: 0; }}
</style>
</head>
<body>
<main>
{cuerpo}
</main>
</body>
</html>
"""


def main() -> int:
    fuente = Path(sys.argv[1]) if len(sys.argv) > 1 else FUENTE
    titulo, cuerpo = convertir(fuente.read_text(encoding="utf-8"))
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(PLANTILLA.format(titulo=html.escape(titulo), cuerpo=cuerpo, claro=paleta("web-tokens"),
                                        oscuro=paleta("web-dark-tokens")), encoding="utf-8")
    print(f"{DESTINO.relative_to(RAIZ)}: {DESTINO.stat().st_size} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
