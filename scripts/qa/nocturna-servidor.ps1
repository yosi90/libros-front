# La campaña de integración QA de cada noche, lanzada desde el servidor (tarea programada «Libros QA nocturna»).
# Desde GitHub no se puede: Cloudflare responde a su runner con un desafío (`cf-mitigated=challenge`). Las suites que
# no tocan la API de QA siguen en `.github/workflows/qa-nightly.yml`.
#
# Usa el checkout del front tal cual (no lo actualiza) y los secretos de `Libros API/qa/.env`, que solo lee
# `run-local-campaign.mjs`. Deja el registro en `.runtime/qa-nocturna/` y, si falla, avisa por Notificapp.
param(
    [string]$EnvFile = (Join-Path $PSScriptRoot '..\..\..\Libros API\qa\.env'),
    [int]$KeepLogs = 14
)

$ErrorActionPreference = 'Stop'
$front = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$logDir = Join-Path $front '.runtime\qa-nocturna'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir ("{0:yyyy-MM-dd_HHmm}.log" -f (Get-Date))

Set-Location -LiteralPath $front
$env:PATH = "$front\.tools\node;$env:PATH"
$env:NG_BUILD_MAX_WORKERS = '2'
$env:GITHUB_RUN_ID = "servidor-{0:yyyyMMddHHmm}" -f (Get-Date)

$head = (git rev-parse --short HEAD 2>$null)
$dirty = if (git status --porcelain 2>$null) { 'con cambios sin commit' } else { 'limpio' }
"Campaña QA nocturna en el servidor. Front $head ($dirty)." | Out-File -FilePath $log -Encoding utf8

# Por cmd: en PowerShell 5.1, redirigir el stderr de un ejecutable lo convierte en errores y corta la campaña.
& cmd.exe /d /c "node scripts/qa/run-local-campaign.mjs --env-file `"$EnvFile`" -- npm run qa:integration >> `"$log`" 2>&1"
$exit = $LASTEXITCODE
"Fin: código $exit." | Out-File -FilePath $log -Append -Encoding utf8

Get-ChildItem -LiteralPath $logDir -Filter '*.log' | Sort-Object Name -Descending | Select-Object -Skip $KeepLogs |
    Remove-Item -Force

if ($exit -ne 0) {
    $noise = 'WebServer|DeprecationWarning|NO_COLOR|trace-warnings|trace-deprecation|CategoryInfo|FullyQualifiedErrorId|^\s*$|^\+ |En línea'
    $tail = Get-Content -LiteralPath $log -Encoding utf8 | Where-Object { $_ -notmatch $noise } | Select-Object -Last 40
    $body = Join-Path $logDir 'aviso.md'
    (@("La campaña QA nocturna del servidor ha fallado (código $exit, front $head, $dirty).",
       "", "Registro: $log", "", '```') + $tail + '```') -join "`n" | Out-File -FilePath $body -Encoding utf8
    $python = 'C:\Users\Yosi\Desktop\notificapp\.venv\Scripts\python.exe'
    $sender = 'C:\Users\Yosi\Desktop\notificapp\notificapp\sender.py'
    if ((Test-Path -LiteralPath $python) -and (Test-Path -LiteralPath $sender)) {
        $env:PYTHONUTF8 = '1'
        & $python $sender --agent Claude --kind agent_finished --title 'Libros · QA nocturna del servidor: ha fallado' --body-file $body
    }
}
exit $exit
