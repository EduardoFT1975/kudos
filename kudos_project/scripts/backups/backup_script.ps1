# backup_script.ps1
$BACKUP_DIR = "C:\backups\kudos"
$DB_USER = "kudos"
$DB_NAME = "kudos_prod"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_PASSWORD = "kudos123"
$S3_BUCKET = "s3://kudos-backups"
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$IPFS_BACKUP_DIR = "C:\backups\ipfs_kudos"
$LOG_FILE = "C:\logs\kudos_backup.log"

New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $IPFS_BACKUP_DIR | Out-Null
New-Item -ItemType Directory -Force -Path "C:\logs" | Out-Null

function Write-Log {
    param($Message)
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $Message"
    Add-Content -Path $LOG_FILE -Value $LogMessage
    Write-Output $LogMessage
}

Write-Log "Iniciando backup de la base de datos..."
$env:PGPASSWORD = $DB_PASSWORD
& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U $DB_USER -h $DB_HOST -p $DB_PORT $DB_NAME | Compress-Archive -DestinationPath "$BACKUP_DIR\kudos_db_$TIMESTAMP.sql.zip" -Force
if ($LASTEXITCODE -eq 0) {
    Write-Log "Backup de la base de datos completado: kudos_db_$TIMESTAMP.sql.zip"
} else {
    Write-Log "Error en el backup de la base de datos"
    exit 1
}

Write-Log "Iniciando backup de IPFS..."
$ipfs_files = & ipfs files ls /kudos_capsules
foreach ($cid in $ipfs_files) {
    & ipfs get "/kudos_capsules/$cid" -o "$IPFS_BACKUP_DIR\$cid"
}
Compress-Archive -Path $IPFS_BACKUP_DIR\* -DestinationPath "$BACKUP_DIR\kudos_ipfs_$TIMESTAMP.zip" -Force
if ($LASTEXITCODE -eq 0) {
    Write-Log "Backup de IPFS completado: kudos_ipfs_$TIMESTAMP.zip"
} else {
    Write-Log "Error en el backup de IPFS"
    exit 1
}

Write-Log "Subiendo backups a S3..."
aws s3 cp "$BACKUP_DIR\kudos_db_$TIMESTAMP.sql.zip" "$S3_BUCKET/db/"
aws s3 cp "$BACKUP_DIR\kudos_ipfs_$TIMESTAMP.zip" "$S3_BUCKET/ipfs/"
if ($LASTEXITCODE -eq 0) {
    Write-Log "Backups subidos a S3 correctamente"
} else {
    Write-Log "Error al subir backups a S3"
    exit 1
}

Get-ChildItem -Path $BACKUP_DIR -Filter "*.zip" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item
Write-Log "Backups antiguos limpiados"

Write-Log "Backup completado"
