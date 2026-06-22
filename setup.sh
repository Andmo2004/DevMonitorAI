#!/bin/bash
set -e

echo "🚀 Iniciando instalación rápida de DevMonitorAI..."

# 1. Variables de entorno
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
