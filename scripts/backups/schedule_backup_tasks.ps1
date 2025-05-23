# schedule_backup_tasks.ps1
$BACKUP_SCRIPT = "C:\Users\efert\kudos_project\scripts\backups\backup_script.ps1"
$LOG_FILE = "C:\logs\kudos_backup.log"

$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File $BACKUP_SCRIPT"
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName "KudosDailyBackup" -Action $action -Trigger $trigger -Settings $settings -Description "Backup diario de la base de datos Kudos" -Force

$triggerWeekly = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "3:00 AM"
Register-ScheduledTask -TaskName "KudosWeeklyIPFSBackup" -Action $action -Trigger $triggerWeekly -Settings $settings -Description "Backup semanal de IPFS Kudos" -Force

Write-Output "Tareas programadas configuradas. Verifica en el Programador de Tareas."
