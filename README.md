# DevMonitor AI

Andrés Moros Rincón

Miguel Ángel Montijano Sempere

___

# Guía de instalación — devmonitor·AI
**Válida para macOS (Intel + Apple Silicon), Linux (x86_64 + ARM) y Windows (WSL2)**

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 20.x | `node --version` |
| npm | 9.x | `npm --version` |
| Python | 3.12 | `python3 --version` |
| Docker Desktop | 4.x | `docker --version` |
| Git | 2.x | `git --version` |

> **Windows:** todos los comandos deben ejecutarse dentro de **WSL2** (Ubuntu 22.04 recomendado), no en PowerShell ni CMD.

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/<tu-org>/devmonitor-ai.git
cd devmonitor-ai
```

---

## 2. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y rellena los valores reales:

```env
DATABASE_URL=postgresql+asyncpg://devmonitor:devmonitor_pass@localhost:5432/devmonitor
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGIN=http://localhost:5173
DEVMONITOR_API_KEY=change-me-in-production
DEBUG=true
```

> El campo `ANTHROPIC_API_KEY` es obligatorio para que funcione la generación de insights. Obtén una en https://console.anthropic.com

---

## 3. Backend (FastAPI + PostgreSQL)

### 3a. Levantar postgres y la API con Docker

```bash
docker compose up --build
```

Esto levanta dos contenedores: `devmonitor_db` (PostgreSQL 16) y `devmonitor_api` (FastAPI).

Verifica que la API responde:

```bash
curl http://localhost:8000/health
# {"status":"ok","version":"1.0.0","service":"devmonitor-ai"}
```

La documentación Swagger está disponible en `http://localhost:8000/docs`.

### 3b. Aplicar migraciones de base de datos

Con los contenedores corriendo, abre otra terminal:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows WSL2: igual
pip install -r requirements.txt
alembic upgrade head
```

Verifica las tablas creadas:

```bash
docker compose exec postgres psql -U devmonitor -d devmonitor -c "\dt"
```

Debes ver: `users`, `ai_events`, `git_events`, `insights`.

### 3c. Cargar datos de demo

```bash
python ../scripts/seed_demo.py
```

Esto genera 5 usuarios ficticios con 14 días de actividad realista.

---

## 4. Frontend (React + Vite)

> El frontend **no usa Docker**. Corre directamente en tu máquina local para evitar problemas de compatibilidad de bindings nativos con arquitecturas ARM.

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Abre `http://localhost:5173` en el navegador.

> **Por qué `--legacy-peer-deps`:** Tremor 3.x requiere React 18, y el flag evita que npm bloquee la instalación por conflictos de peer dependencies declaradas. No afecta al funcionamiento en runtime.

---

## 5. Verificación completa

Con todo corriendo, comprueba que el stack funciona de extremo a extremo:

```bash
# 1. API health
curl http://localhost:8000/health

# 2. KPIs con datos seed
curl "http://localhost:8000/api/v1/dashboard/kpis?user_id=1&days=14"

# 3. Agente demo (envía eventos de prueba)
cd scripts
DEVMONITOR_USER_ID=1 python devmonitor_agent.py --demo

# 4. Frontend
# Abre http://localhost:5173 en el navegador
```

---

## 6. Resolución de problemas frecuentes

### `error getting credentials - docker-credential-desktop not found`

```bash
# Edita la configuración de Docker
nano ~/.docker/config.json

# Cambia "credsStore": "desktop" por "credsStore": ""
# El fichero debe quedar así:
# { "auths": {} }
```

### `ERESOLVE unable to resolve dependency tree` en npm

```bash
npm install --legacy-peer-deps
```

### `Cannot find native binding` (rolldown, Vite 6+, ARM)

Causado por usar Vite 6+ dentro de Docker en arquitectura ARM. Solución: no uses Docker para el frontend, corre `npm run dev` directamente en tu máquina como indica el paso 4.

### `vite.config.ts` con plugin no instalado

```bash
cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
})
EOF
```

### Puerto 5432 ya en uso (postgres local)

```bash
# Detén el postgres local si tienes uno corriendo
brew services stop postgresql   # macOS
sudo systemctl stop postgresql  # Linux

# O cambia el puerto en docker-compose.yml:
# ports: ["5433:5432"]
# Y actualiza DATABASE_URL en .env con el puerto 5433
```

### `alembic upgrade head` falla con "can't connect"

Asegúrate de que el contenedor de postgres está corriendo y healthy antes de ejecutar las migraciones:

```bash
docker compose ps
# devmonitor_db debe aparecer como "healthy"
```

---

## 7. Estructura del stack en local

```
Tu máquina
├── http://localhost:5173  →  Frontend React (npm run dev)
├── http://localhost:8000  →  API FastAPI    (Docker)
└── localhost:5432         →  PostgreSQL     (Docker)
```

---

## 8. Comandos de uso diario

```bash
# Arrancar el backend completo
docker compose up

# Parar el backend
docker compose down

# Ver logs de la API
docker compose logs -f api

# Arrancar el frontend
cd frontend && npm run dev

# Regenerar migraciones tras cambiar modelos
cd backend && alembic revision --autogenerate -m "descripcion"
alembic upgrade head

# Re-ejecutar el seed (borra y recrea datos demo)
cd backend && python ../scripts/seed_demo.py
```