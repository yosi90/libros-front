# Origen de las fuentes de `app/src/main/res/font`

## Literata (serif de lectura)

La misma serif de lectura que la web (`--web-font-reading`, `src/assets/fonts/literata/`), versión 3.103. Licencia SIL OFL 1.1, sin nombre reservado (`LICENSE-literata.txt`), así que se pueden sacar instancias.

- **De dónde:** las variables `Literata[opsz,wght].ttf` y `Literata-Italic[opsz,wght].ttf` de `github.com/google/fonts`, carpeta `ofl/literata`, el 2026-11-26 (SHA-256 `b41138c9…6f274440` y `d483dfae…d1fcd465`). No se versionan: solo sus instancias.
- **Qué hay:** una fuente fija por cada grosor, sin `FontVariation` (`ecosistema-kit/APK.md`, «Las fuentes»): redonda 400, 500 y 600, y cursiva 400 y 500, los grosores de la maqueta de la vista de libro. El tamaño óptico queda en el de por defecto (12), como en las estáticas de la web, y los caracteres, en los latinos (`--latino`).
- **Dónde se usa:** `Fuentes.lectura` (`ui/tema/Tipografia.kt`), en la vista de libro «Cuaderno»: el capítulo, Elementos, las notas y el editor RTF.

Para volver a sacarlas, con fontTools (`py -3 -m pip install fonttools`):

```powershell
py -3 ecosistema-kit/herramientas/fuentes_fijas.py Literata[opsz,wght].ttf android-nativa/app/src/main/res/font literata 400 500 600 --latino
py -3 ecosistema-kit/herramientas/fuentes_fijas.py Literata-Italic[opsz,wght].ttf android-nativa/app/src/main/res/font literata_cursiva 400 500 --latino
```
