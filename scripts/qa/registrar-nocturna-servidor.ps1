# Registra (o actualiza) la tarea programada «Libros QA nocturna»: cada día a las 03:30 lanza
# `nocturna-servidor.ps1` con el usuario actual, solo con la sesión iniciada y sin guardar contraseña.
$ErrorActionPreference = 'Stop'
$front = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script = Join-Path $PSScriptRoot 'nocturna-servidor.ps1'

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -File `"$script`"" -WorkingDirectory $front
$trigger = New-ScheduledTaskTrigger -Daily -At '03:30'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName 'Libros QA nocturna' -Force -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
    -Description 'Campaña de integración QA de Libros (front/scripts/qa/nocturna-servidor.ps1). Avisa por Notificapp si falla.' |
    Out-Null
$next = (Get-ScheduledTask -TaskName 'Libros QA nocturna' | Get-ScheduledTaskInfo).NextRunTime
Write-Host "Tarea «Libros QA nocturna» registrada. Próxima ejecución: $next."
