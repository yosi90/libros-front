# Entorno local de desarrollo

## Primera ejecución

Desde la raíz del repositorio:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r docs\backend\desarrollo\requirements.txt
npm ci
```

SQL Server debe estar accesible con los valores de `.env`. La configuración de partida está en `.env.example`.

## Ejecución habitual

Solo API:

```powershell
.\.venv\Scripts\Activate.ps1
python app.py
```

El lector del feed de la plataforma, en otra consola:

```powershell
python -m realtime.plataforma_feed_worker
```

QA aislado:

```powershell
.\qa\setup.ps1
.\qa\start.ps1
```

## Verificación

La matriz completa por tipo de cambio y las reglas para integracion SQL, smoke QA y cambios de alto riesgo estan en `../qa/PRUEBAS.md`.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests
npm run lint:openapi
git diff --check
```

No hace falta activar el entorno virtual si se invoca directamente `.venv\Scripts\python.exe`.
