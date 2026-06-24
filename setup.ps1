$ErrorActionPreference = "Stop"

Write-Host "Iniciando instalacion rapida de DevMonitorAI..."

# 1. Variables de entorno
Write-Host "Comprobando dependencias locales..."

if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Host "Python no esta instalado. Se requiere Python >= 3.12."
    exit 1
}

# Comprobación de Python limpia
$python_version = python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
$major = [int]($python_version.Split('.')[0])
$minor = [int]($python_version.Split('.')[1])

if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 12)) {
    Write-Host "Aviso: Se recomienda Python >= 3.12 (Detectado $python_version)"
} else {
    Write-Host "Python $python_version detectado."
}

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js no esta instalado. Se requiere Node >= 20."
    exit 1
}

$node_version_raw = node -v
$node_version = [int]($node_version_raw.TrimStart('v').Split('.')[0])
if ($node_version -lt 20) {
    Write-Host "Aviso: Se recomienda Node.js >= 20 (Detectado $node_version_raw)"
} else {
    Write-Host "Node.js $node_version_raw detectado."
}

Write-Host ""

# 2. Configurar Variables de entorno
if (-not (Test-Path ".env")) {
    Write-Host "Creando archivo .env desde .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Host "Por favor, revisa el archivo .env y añade tu ANTHROPIC_API_KEY antes de usar la aplicación."
} else {
    Write-Host "Archivo .env ya existe."
}

# 2. Levantar Docker (Base de datos y API)
Write-Host "Levantando contenedores Docker en segundo plano..."
docker compose up -d --build

# Esperar a que la base de datos esté lista
Write-Host "Esperando a que la base de datos se inicialice..."
Start-Sleep -Seconds 5

$ErrorActionPreference = "Stop"

Write-Host "Iniciando instalacion rapida de DevMonitorAI..."

# 1. Variables de entorno
Write-Host "Comprobando dependencias locales..."

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js no esta instalado. Se requiere Node >= 20."
    exit 1
}

$node_version_raw = node -v
Write-Host "Node.js $node_version_raw detectado."

Write-Host ""

# 2. Configurar Variables de entorno
if (-not (Test-Path ".env")) {
    Write-Host "Creando archivo .env desde .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Host "Por favor, revisa el archivo .env y añade tu ANTHROPIC_API_KEY antes de usar la aplicación."
} else {
    Write-Host "Archivo .env ya existe."
}

# 3. Levantar Docker (Base de datos y API del Backend)
Write-Host "Asegurate de tener DOCKER DESKTOP abierto y en verde antes de continuar..."
Write-Host "Levantando contenedores Docker en segundo plano..."
docker compose up -d --build

Write-Host "Esperando a que los servicios de Docker arranquen..."
Start-Sleep -Seconds 8

# 4. Frontend Setup (Instalación nativa en Windows)
Write-Host "Configurando el Frontend..."
Set-Location frontend
npm install --legacy-peer-deps

Set-Location ..

Write-Host ""
Write-Host "Instalacion completada con exito!"
Write-Host ""
Write-Host "Para iniciar la aplicación frontend, ejecuta:"
Write-Host "    cd frontend ; npm run dev"
Write-Host ""
Write-Host "La API ya está corriendo en Docker: http://localhost:8000"
Write-Host "El frontend estará disponible en http://localhost:5173"
Write-Host "Documentacion de la API en http://localhost:8000/docs"

# 4. Frontend Setup
Write-Host "Configurando el Frontend..."
Set-Location frontend
npm install --legacy-peer-deps

Set-Location ..

Write-Host ""
Write-Host "Instalacion completada con exito!"
Write-Host ""
Write-Host "Para iniciar la aplicación frontend, ejecuta:"
Write-Host "    cd frontend ; npm run dev"
Write-Host ""
Write-Host "La API ya está corriendo en http://localhost:8000"
Write-Host "El frontend estará disponible en http://localhost:5173"
Write-Host "Documentacion de la API en http://localhost:8000/docs"