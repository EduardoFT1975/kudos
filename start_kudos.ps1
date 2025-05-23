# start_kudos.ps1

Write-Host 'Iniciando proyecto Kudos...'

# Verificar si Docker está instalado y ejecutándose
Write-Host 'Verificando Docker...'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'Error: Docker no está instalado. Por favor, instala Docker Desktop desde https://www.docker.com/products/docker-desktop/' -ForegroundColor Red
    exit 1
}
$dockerService = Get-Service -Name com.docker.service -ErrorAction SilentlyContinue
if (-not $dockerService -or $dockerService.Status -ne 'Running') {
    Write-Host 'Error: Docker no está ejecutándose. Inicia Docker Desktop y vuelve a intentarlo.' -ForegroundColor Red
    exit 1
}

# Verificar si docker-compose está instalado
Write-Host 'Verificando docker-compose...'
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host 'Error: docker-compose no está instalado. Instálalo siguiendo las instrucciones en https://docs.docker.com/compose/install/' -ForegroundColor Red
    exit 1
}

# Verificar la existencia de docker-compose.yml
Write-Host 'Verificando docker-compose.yml...'
if (-not (Test-Path 'docker-compose.yml')) {
    Write-Host 'Error: No se encontró docker-compose.yml en el directorio actual. Asegúrate de estar en el directorio raíz del proyecto.' -ForegroundColor Red
    exit 1
}

# Crear directorio de logs si no existe
$logDir = '/app/logs'
docker-compose exec app mkdir -p $logDir 2>$null
if ($?) {
    Write-Host 'Directorio de logs creado/verificado.'
} else {
    Write-Host 'Advertencia: No se pudo verificar/crear el directorio de logs. Continuando...' -ForegroundColor Yellow
}

# Iniciar Docker Compose
Write-Host 'Iniciando servicios con Docker Compose...'
docker-compose up -d --build
if ($?) {
    Write-Host 'Docker Compose iniciado correctamente.' -ForegroundColor Green

    # Esperar a que los servicios estén listos (máximo 30 segundos)
    Write-Host 'Esperando a que los servicios estén listos...'
    Start-Sleep -Seconds 10
    $appRunning = docker-compose ps | Select-String 'kudos_project-app-1.*Up'
    if (-not $appRunning) {
        Write-Host 'Advertencia: El servicio app no está listo. Verifica los logs con \"docker-compose logs app\".' -ForegroundColor Yellow
    }

    # Abrir shell de Django en segundo plano
    Write-Host 'Abriendo shell de Django en kudos_project-app-1...'
    Start-Process -FilePath \"cmd.exe\" -ArgumentList \"/c docker exec -it kudos_project-app-1 python manage.py shell\"

    # Mostrar información de acceso
    Write-Host 'Proyecto Kudos iniciado correctamente.' -ForegroundColor Green
    Write-Host 'Accede a Streamlit en: http://localhost:8502'
    Write-Host 'Shell de Django abierto en kudos_project-app-1.'
    Write-Host 'Para ver los logs, usa: docker-compose logs'
    Write-Host 'Para detener los servicios, usa: docker-compose down'
} else {
    Write-Host 'Error al iniciar Docker Compose. Revisa docker-compose.yml y los logs con \"docker-compose logs\".' -ForegroundColor Red
    exit 1
}
