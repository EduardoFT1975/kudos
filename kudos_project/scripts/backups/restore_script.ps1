# restore_script.ps1
$BACKUP_DIR = "C:\backups\kudos"
$DB_USER = "kudos"
$DB_NAME = "kudos_prod"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_PASSWORD = "kudos123"
$S3_BUCKET = "s3://kudos-backups"
$BACKUP_DATE = $args[0]
$IPFS_BACKUP_DIR = "C:\backups\ipfs_kudos"
$LOG_FILE = "C:\logs\kudos_backup.log"

if (-not $BACKUP_DATE) {
    Write-Output "Uso: .\restore_script.ps1 <fecha_backup> (ejemplo: 20250523_150000)"
    exit 1
}

function Write-Log {
    param($Message)
    $LogMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $Message"
    Add-Content -Path $LOG_FILE -Value $LogMessage
    Write-Output $LogMessage
}

Write-Log "Descargando backups de S3..."
aws s3 cp "$S3_BUCKET/db/kudos_db_$BACKUP_DATE.sql.zip" "$BACKUP_DIR\"
aws s3 cp "$S3_BUCKET/ipfs/kudos_ipfs_$BACKUP_DATE.zip" "$BACKUP_DIR\"
if ($LASTEXITCODE -ne 0) {
    Write-Log "Error al descargar backups de S3"
    exit 1
}

Write-Log "Restaurando base de datos..."
Expand-Archive -Path "$BACKUP_DIR\kudos_db_$BACKUP_DATE.sql.zip" -DestinationPath "$BACKUP_DIR\temp" -Force
$env:PGPASSWORD = $DB_PASSWORD
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -f "$BACKUP_DIR\temp\kudos_db_$BACKUP_DATE.sql"
if ($LASTEXITCODE -eq 0) {
    Write-Log "Base de datos restaurada"
    Remove-Item -Path "$BACKUP_DIR\temp" -Recurse -Force
} else {
    Write-Log "Error al restaurar la base de datos"
    exit 1
}

Write-Log "Restaurando archivos IPFS..."
Remove-Item -Path "$IPFS_BACKUP_DIR\*" -Recurse -Force -ErrorAction SilentlyContinue
Expand-Archive -Path "$BACKUP_DIR\kudos_ipfs_$BACKUP_DATE.zip" -DestinationPath $IPFS_BACKUP_DIR -Force
& ipfs files rm -r /kudos_capsules -ErrorAction SilentlyContinue
& ipfs files mkdir /kudos_capsules
Get-ChildItem -Path $IPFS_BACKUP_DIR | ForEach-Object {
    $cid = & ipfs add -r $_.FullName -Q
    & ipfs files cp /ipfs/$cid /kudos_capsules/$($_.Name)
}
if ($LASTEXITCODE -eq 0) {
    Write-Log "Archivos IPFS restaurados"
} else {
    Write-Log "Error al restaurar archivos IPFS"
    exit 1
}

Write-Log "Restauración completada"
