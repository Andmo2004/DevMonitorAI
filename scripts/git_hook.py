#!/usr/bin/env python3
"""
devmonitor·AI — Git post-commit hook (multiplataforma).

Por qué Python en vez de bash/PowerShell:
- El resto de scripts/ ya son Python; un único lenguaje evita duplicar la
  lógica de red (cálculo de stats, payload, envío HTTP) en dos sintaxis distintas.
- Git invoca los hooks a través de su propio intérprete sh embebido (también en
  Git for Windows, vía Git Bash/MSYS), que respeta la línea shebang siempre que
  el interprete (python) esté en el PATH. Por eso un único archivo .py funciona
  en Linux, macOS, WSL2 y Windows sin necesitar una versión .sh y otra .ps1.

Instalación (igual en todos los sistemas):
    cp scripts/git_hook.py .git/hooks/post-commit
    chmod +x .git/hooks/post-commit   # innecesario en Windows, no hace daño

Variables de entorno opcionales:
    DEVMONITOR_API_URL  (default: http://localhost:8000)
    DEVMONITOR_USER_ID  (default: 1)
    DEVMONITOR_API_KEY  (default: vacío)
"""
import os
import re
import subprocess
import sys
from datetime import datetime, timezone

import httpx

API_URL = os.getenv("DEVMONITOR_API_URL", "http://localhost:8000")
USER_ID = int(os.getenv("DEVMONITOR_USER_ID", "1"))
API_KEY = os.getenv("DEVMONITOR_API_KEY", "")

EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"


def run_git(*args: str) -> str:
    """Ejecuta un comando git y devuelve stdout limpio. Cadena vacía si falla."""
    try:
        result = subprocess.run(
            ["git", *args], capture_output=True, text=True, check=True
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def get_commit_stats() -> tuple[int, int, int]:
    """
    Devuelve (files_changed, insertions, deletions) del último commit.
    Si es el primer commit del repo (no existe HEAD~1), compara contra el
    árbol vacío en lugar de fallar.
    """
    stat = run_git("diff", "--shortstat", "HEAD~1", "HEAD")
    if not stat:
        stat = run_git("diff", "--shortstat", EMPTY_TREE_SHA, "HEAD")

    files_match = re.search(r"(\d+) file", stat)
    ins_match = re.search(r"(\d+) insertion", stat)
    del_match = re.search(r"(\d+) deletion", stat)

    files = int(files_match.group(1)) if files_match else 0
    insertions = int(ins_match.group(1)) if ins_match else 0
    deletions = int(del_match.group(1)) if del_match else 0
    return files, insertions, deletions


def main() -> None:
    commit_sha = run_git("log", "-1", "--format=%H")
    commit_msg = run_git("log", "-1", "--format=%s")
    repo_root = run_git("rev-parse", "--show-toplevel")
    repo = os.path.basename(repo_root) if repo_root else "unknown"
    branch = run_git("rev-parse", "--abbrev-ref", "HEAD")
    files_changed, insertions, deletions = get_commit_stats()

    payload = {
        "user_id": USER_ID,
        "commit_sha": commit_sha,
        "commit_message": commit_msg,
        "repo": repo,
        "branch": branch,
        "files_changed": files_changed,
        "insertions": insertions,
        "deletions": deletions,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }

    try:
        response = httpx.post(
            f"{API_URL}/api/v1/events/git",
            json=payload,
            headers={"X-API-Key": API_KEY},
            timeout=3.0,
        )
        response.raise_for_status()
        print("[devmonitor] ✅ Commit registrado en devmonitor·AI")
    except Exception as exc:
        # Un fallo de red NUNCA debe interrumpir el flujo de git del desarrollador.
        print(f"[devmonitor] ⚠️  No se pudo registrar el commit: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()