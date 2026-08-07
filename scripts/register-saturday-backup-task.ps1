# 토요일 추첨 후 로컬 백업 (GitHub Actions 실패 대비)
# 관리자 PowerShell: .\scripts\register-saturday-backup-task.ps1

$RepoRoot = Split-Path $PSScriptRoot -Parent
$Node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $Node) { throw "node not found in PATH" }

$Times = @("21:05", "21:35", "22:05", "22:35")
$TaskPrefix = "LottoSaturdayBackup"

foreach ($existing in Get-ScheduledTask -TaskName "$TaskPrefix*" -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $existing.TaskName -Confirm:$false
}

foreach ($time in $Times) {
  $name = "$TaskPrefix-$($time.Replace(':',''))"
  $action = New-ScheduledTaskAction -Execute $Node -Argument "scripts\saturday-update-deploy.mjs" -WorkingDirectory $RepoRoot
  $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At $time
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Description "Lotto round update backup (GitHub CI fallback)" -Force | Out-Null
  Write-Host "Registered: $name at Saturday $time"
}

Write-Host "Done. PC must be on and logged in around draw time."
