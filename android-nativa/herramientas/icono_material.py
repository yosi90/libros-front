"""Copia iconos de Material Icons (filled) como vectores de Android, con el mismo nombre que el `mat-icon` de la web.

Uso: python -I herramientas/icono_material.py <carpeta del paquete> <nombre> [<nombre>...]

La carpeta es la de `@material-design-icons/svg` (npm pack @material-design-icons/svg@0.14.15 y descomprimir), que trae
los mismos glifos que la fuente `material-icons` 1.13.14 que usa la APK de Capacitor. Cada icono va a
`app/src/main/res/drawable/mi_<nombre>.xml`. Solo admite SVG de uno o varios <path> y <circle> sin transformaciones
(se juntan en un trazo; los círculos, como dos arcos), como son los de ese paquete; si encuentra otra cosa, se para.
"""

import pathlib
import sys
import xml.etree.ElementTree as ET

SVG = "{http://www.w3.org/2000/svg}"
DESTINO = pathlib.Path(__file__).resolve().parent.parent / "app" / "src" / "main" / "res" / "drawable"

PLANTILLA = """<?xml version="1.0" encoding="utf-8"?>
<!-- Material Icons «{nombre}» (filled), de @material-design-icons/svg 0.14.15. Apache 2.0, Google. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FF000000" android:pathData="{trazo}" />
</vector>
"""


def convertir(paquete, nombre):
    raiz = ET.parse(pathlib.Path(paquete) / "filled" / f"{nombre}.svg").getroot()
    if raiz.get("viewBox") != "0 0 24 24":
        raise SystemExit(f"{nombre}: caja inesperada {raiz.get('viewBox')}")
    hijos = list(raiz)
    # Varios <path> sencillos (collections_bookmark) se juntan en uno: tienen el mismo relleno y cada uno empieza por M.
    # Un <circle> (person_search) pasa a trazo con dos arcos.
    if not hijos or any(not (_es_trazo(h) or _es_circulo(h)) for h in hijos):
        raise SystemExit(f"{nombre}: no son solo <path> o <circle> sencillos")
    salida = DESTINO / f"mi_{nombre}.xml"
    trazo = " ".join(h.get("d") if _es_trazo(h) else _circulo(h) for h in hijos)
    salida.write_text(PLANTILLA.format(nombre=nombre, trazo=trazo), encoding="utf-8", newline="\n")
    print(salida.name)


def _es_trazo(h):
    return h.tag == SVG + "path" and set(h.attrib) == {"d"}


def _es_circulo(h):
    return h.tag == SVG + "circle" and set(h.attrib) == {"cx", "cy", "r"}


def _circulo(h):
    cx, cy, r = (float(h.get(a)) for a in ("cx", "cy", "r"))
    return f"M{cx - r:g},{cy:g}a{r:g},{r:g} 0 1,0 {2 * r:g},0a{r:g},{r:g} 0 1,0 {-2 * r:g},0z"


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    for n in sys.argv[2:]:
        convertir(sys.argv[1], n)
