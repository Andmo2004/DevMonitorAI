#!/bin/bash
set -e

echo "🚀 Iniciando instalación rápida de DevMonitorAI..."

# 1. Variables de entorno
echo "🔍 Comprobando dependencias locales..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado. Se requiere Python >= 3.12."
    exit 1
fi
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
if [ "$(printf '%s\n' "3.12" "$python_version" | sort -V | head -n1)" != "3.12" ]; then
    echo "⚠️  Aviso: Se recomienda Python >= 3.12 (Detectado $python_version)"
else
    echo "✅ Python $python_version detectado."
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Se requiere Node >= 20."
    exit 1
fi
node_version=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$node_version" -lt 20 ]; then
    echo "⚠️  Aviso: Se recomienda Node.js >= 20 (Detectado $node_version)"
else
    echo "✅ Node.js v$node_version detectado."
fi

echo ""

# 2. Configurar Variables de entorno
if [ ! -f .env ]; then
  echo "📄 Creando archivo .env desde .env.example..."
  cp .env.example .env
  echo "⚠️ Por favor, revisa el archivo .env y añade tu ANTHROPIC_API_KEY antes de usar la aplicación."
else
  echo "✅ Archivo .env ya existe."
fi

# 2. Levantar Docker (Base de datos y API)
echo "🐳 Levantando contenedores Docker en segundo plano..."
docker compose up -d --build

# Esperar a que la base de datos esté lista (ajusta el tiempo si es necesario)
echo "⏳ Esperando a que la base de datos se inicialice..."
sleep 5

# 3. Backend Setup
echo "🐍 Configurando el entorno del Backend..."
cd backend

if command -v uv &> /dev/null; then
    echo "⚡ Usando 'uv' para crear el entorno virtual..."
    uv venv --python 3.12 .venv
    source .venv/bin/activate
    uv pip install -r requirements.txt
else
    echo "🐍 Usando 'venv' estándar..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
fi

echo "🗄️ Aplicando migraciones de base de datos..."
alembic upgrade head

echo "🌱 Cargando datos de prueba (seed)..."
python ../scripts/seed_demo.py

echo "🪝 Instalando git hook post-commit..."
cp ../scripts/git_hook.py ../.git/hooks/post-commit
chmod +x ../.git/hooks/post-commit

cd ..

# 4. Frontend Setup
echo "⚛️ Configurando el Frontend..."
cd frontend
npm install --legacy-peer-deps

cd ..

echo ""
echo "✅ ¡Instalación completada con éxito!"
echo ""
echo "🖥️  Para iniciar la aplicación frontend, ejecuta:"
echo "    cd frontend && npm run dev"
echo ""
echo "🔌 La API ya está corriendo en http://localhost:8000"
echo "🌐 El frontend estará disponible en http://localhost:5173"
echo "📚 Documentación de la API en http://localhost:8000/docs"
