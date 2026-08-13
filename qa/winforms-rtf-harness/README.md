# Harness RTF de RichEdit

Proyecto Windows aislado que usa `System.Windows.Forms.RichTextBox.Rtf` como oráculo de interpretación. No referencia la aplicación WinForms original, el backend ni SQL Server.

## Interfaz JSONL

El modo predeterminado lee una solicitud por línea desde la entrada estándar:

```json
{"id":"identificador-opaco","leftRtfBase64":"...","rightRtfBase64":"..."}
```

La respuesta contiene el identificador, hashes SHA-256, resúmenes, equivalencia y categorías/posiciones de diferencias. Nunca devuelve texto ni RTF.

## Diagnóstico visual opcional

```powershell
dotnet run --project qa/winforms-rtf-harness -- view izquierda.rtf derecha.rtf
```

Este modo abre ambos documentos lado a lado y solo debe usarse localmente con archivos que el usuario haya elegido expresamente.

## Campañas frontend

```powershell
npm run qa:rtf:fixtures
npm run qa:rtf:corpus
```

La segunda orden solo funciona en Windows y lee en memoria los RTF actuales de `YOSI-PC/libros` mediante las consultas fijas de solo lectura. Sus informes bajo `test-results/` no contienen documentos.
