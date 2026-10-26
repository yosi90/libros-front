"""El icono de la app para la ficha (512 × 512): el del lanzador adaptable, con su fondo, a sangre."""
from pathlib import Path

from PIL import Image

RES = Path(r"C:\Users\Yosi\Desktop\Memoria bibliográfica\front\android-nativa\app\src\main\res")
SALIDA = Path(__file__).with_name("libros-icono-512.png")

primer_plano = Image.open(RES / "mipmap-xxxhdpi" / "ic_launcher_foreground.png").convert("RGBA")
icono = Image.new("RGBA", (512, 512), "#F4E7CF")
# El primer plano adaptable mide 108 dp, de los que se ven los 72 del centro: se recorta a esa parte visible.
lado = primer_plano.width
visible = round(lado * 72 / 108)
margen = (lado - visible) // 2
recorte = primer_plano.crop((margen, margen, margen + visible, margen + visible)).resize((512, 512), Image.LANCZOS)
icono.alpha_composite(recorte)
icono.convert("RGB").save(SALIDA)
print(SALIDA, icono.size)
