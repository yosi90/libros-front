"""La ficha de la app (1600 × 900, kit 1.45): icono, nombre y frase a la izquierda; el móvil con la Biblioteca a la derecha."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = Path(__file__).parent
CAPTURA = Path(r"C:\Users\Yosi\Desktop\Memoria bibliográfica\referencias-apk-capacitor\_kotlin\biblioteca\raiz-claro-movil.png")
FUENTES = Path(r"C:\Windows\Fonts")
ANCHO, ALTO = 1600, 900

# Fondo: degradado suave del verde de la marca (#006B5D), oscurecido.
fondo = Image.new("RGB", (ANCHO, ALTO))
arriba, abajo = (0, 58, 51), (6, 30, 28)
pintor = ImageDraw.Draw(fondo)
for y in range(ALTO):
    t = y / (ALTO - 1)
    pintor.line([(0, y), (ANCHO, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(arriba, abajo)))
ficha = fondo.convert("RGBA")


def redondear(imagen: Image.Image, radio: int) -> Image.Image:
    mascara = Image.new("L", imagen.size, 0)
    ImageDraw.Draw(mascara).rounded_rectangle((0, 0, imagen.width - 1, imagen.height - 1), radio, fill=255)
    salida = imagen.convert("RGBA")
    salida.putalpha(mascara)
    return salida


# Izquierda: el icono (150 px, esquinas redondeadas), el nombre y la frase.
icono = redondear(Image.open(AQUI / "libros-icono-512.png").resize((150, 150), Image.LANCZOS), 34)
x0 = 140
ficha.alpha_composite(icono, (x0, 250))
titulo = ImageFont.truetype(str(FUENTES / "georgiab.ttf"), 132)
frase = ImageFont.truetype(str(FUENTES / "segoeui.ttf"), 44)
dibujo = ImageDraw.Draw(ficha)
dibujo.text((x0 - 6, 430), "Libros", font=titulo, fill=(244, 231, 207))
dibujo.text((x0, 600), "Tu registro personal de lecturas,", font=frase, fill=(178, 223, 214))
dibujo.text((x0, 656), "ahora también en el móvil.", font=frase, fill=(178, 223, 214))

# Derecha: el móvil, con la pantalla de la Biblioteca (la muestra de depuración, sin datos de nadie).
alto_pantalla = 740
captura = Image.open(CAPTURA).convert("RGB")
ancho_pantalla = round(captura.width * alto_pantalla / captura.height)
pantalla = redondear(captura.resize((ancho_pantalla, alto_pantalla), Image.LANCZOS), 30)
marco = 12
movil = Image.new("RGBA", (ancho_pantalla + 2 * marco, alto_pantalla + 2 * marco), (0, 0, 0, 0))
ImageDraw.Draw(movil).rounded_rectangle((0, 0, movil.width - 1, movil.height - 1), 42, fill=(16, 20, 20, 255), outline=(70, 90, 86, 255), width=2)
movil.alpha_composite(pantalla, (marco, marco))
xm, ym = 1600 - 190 - movil.width, (ALTO - movil.height) // 2
sombra = Image.new("RGBA", ficha.size, (0, 0, 0, 0))
ImageDraw.Draw(sombra).rounded_rectangle((xm + 10, ym + 18, xm + movil.width + 10, ym + movil.height + 18), 42, fill=(0, 0, 0, 120))
ficha.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(18)))
ficha.alpha_composite(movil, (xm, ym))

salida = AQUI / "libros-ficha-1600x900.png"
ficha.convert("RGB").save(salida)
print(salida, ficha.size, "móvil en", (xm, ym, xm + movil.width, ym + movil.height))
