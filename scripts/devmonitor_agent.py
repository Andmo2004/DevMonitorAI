#!/usr/bin/env python3
"""
devmonitor·AI Agent — CLI wrapper para captura de eventos de uso de IA.

Uso:
    # Modo interactivo (lee de stdin)
    echo '{"model": "claude-sonnet-4-6", "tokens_in": 500, "tokens_out": 800}' | python devmonitor_agent.py

    # Modo argumento directo
    python devmonitor_agent.py --model claude-sonnet-4-6 --tokens-in 500 --tokens-out 800 --type code_generation

    # Modo pipe (simula captura de una sesión real)
    python devmonitor_agent.py --demo
"""
import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import httpx

API_BASE_URL = os.getenv("DEVMONITOR_API_URL", "http://localhost:8000")
API_KEY = os.getenv("DEVMONITOR_API_KEY", "")
DEFAULT_USER_ID = int(os.getenv("DEVMONITOR_USER_ID", "1"))


def send_event(event_data: dict) -> bool:
    """
    Envía un evento de IA al servidor devmonitor.

    Returns:
        True si el envío fue exitoso, False en caso contrario.
    """
    try:
        response = httpx.post(
            f"{API_BASE_URL}/api/v1/events/ai",
            json=event_data,
            headers={"X-devmonitor-Key": API_KEY},
            timeout=5.0,
        )
        response.raise_for_status()
        return True
    except httpx.TimeoutException:
        print(f"[devmonitor] ⚠️  Timeout al conectar con {API_BASE_URL}", file=sys.stderr)
        return False
    except httpx.HTTPStatusError as e:
        print(f"[devmonitor] ⚠️  Error HTTP {e.response.status_code}: {e.response.text}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[devmonitor] ⚠️  Error inesperado: {e}", file=sys.stderr)
        return False


def parse_stdin_event() -> dict | None:
    """Lee un evento JSON desde stdin."""
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            return None
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[devmonitor] ❌ JSON inválido en stdin: {e}", file=sys.stderr)
        return None


def run_demo_mode():
    """Modo demo: simula una sesión de uso de IA con datos realistas."""
    import random
    demo_events = [
        {
            "user_id": DEFAULT_USER_ID,
            "model_id": "claude-3-5-sonnet-20241022",
            "prompt_type": "code_generation",
            "prompt_text": "[DEMO] Genera una función Python para calcular el factorial",
            "tokens_in": random.randint(200, 600),
            "tokens_out": random.randint(300, 900),
            "repo": "devmonitor-ai",
            "session_id": f"demo-{int(time.time())}",
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        },
        {
            "user_id": DEFAULT_USER_ID,
            "model_id": "claude-3-haiku-20240307",
            "prompt_type": "debugging",
            "prompt_text": "[DEMO] ¿Por qué mi query SQL es lenta?",
            "tokens_in": random.randint(100, 400),
            "tokens_out": random.randint(200, 600),
            "repo": "api-gateway",
            "session_id": f"demo-{int(time.time())}",
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        },
    ]

    for i, event in enumerate(demo_events):
        print(f"[devmonitor] 📤 Enviando evento demo {i+1}/{len(demo_events)}...")
        success = send_event(event)
        if success:
            cost = event["tokens_in"] * 0.000003 + event["tokens_out"] * 0.000015
            print(f"[devmonitor] ✅ Evento registrado — {event['tokens_in']+event['tokens_out']} tokens | ~{cost:.4f} EUR")
        time.sleep(0.5)


def main():
    parser = argparse.ArgumentParser(
        description="devmonitor·AI Agent — Captura y envía eventos de uso de IA"
    )
    parser.add_argument("--model", default="claude-3-5-sonnet-20241022", help="Modelo de IA usado")
    parser.add_argument("--type", dest="prompt_type", default="code_generation",
                        choices=["code_generation", "refactoring", "debugging",
                                 "explanation", "boilerplate", "testing", "documentation", "other"])
    parser.add_argument("--tokens-in", type=int, default=0, help="Tokens de entrada")
    parser.add_argument("--tokens-out", type=int, default=0, help="Tokens de salida")
    parser.add_argument("--repo", default=None, help="Nombre del repositorio")
    parser.add_argument("--user-id", type=int, default=DEFAULT_USER_ID, help="ID del usuario")
    parser.add_argument("--demo", action="store_true", help="Ejecutar en modo demo")
    parser.add_argument("--stdin", action="store_true", help="Leer evento JSON desde stdin")

    args = parser.parse_args()

    if args.demo:
        print("[devmonitor] 🚀 Iniciando modo demo...")
        run_demo_mode()
        return

    if args.stdin or not sys.stdin.isatty():
        event = parse_stdin_event()
        if event is None:
            sys.exit(1)
    else:
        if args.tokens_in == 0:
            print("[devmonitor] ❌ Especifica --tokens-in o usa --stdin", file=sys.stderr)
            sys.exit(1)

        event = {
            "user_id": args.user_id,
            "model_id": args.model,
            "prompt_type": args.prompt_type,
            "tokens_in": args.tokens_in,
            "tokens_out": args.tokens_out,
            "repo": args.repo,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        }

    success = send_event(event)
    if success:
        print("[devmonitor] ✅ Evento registrado")

if __name__ == "__main__":
    main()
