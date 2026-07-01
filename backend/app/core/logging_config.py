"""
Configuración de logging estructurado para DevMonitor·AI.

Establece un formato consistente para todos los logs de la aplicación:
- Timestamp ISO 8601
- Nivel (INFO/WARNING/ERROR/etc.)
- Logger name (módulo que genera el log)
- Mensaje

Se aplica al arranque desde main.py.
"""
import logging
import sys


def setup_logging(debug: bool = False) -> None:
    """
    Configura el logging de toda la aplicación.

    Args:
        debug: Si True, establece nivel DEBUG; si False, INFO.
    """
    level = logging.DEBUG if debug else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Configurar el logger raíz de la aplicación
    root_logger = logging.getLogger("devmonitor")
    root_logger.setLevel(level)
    root_logger.addHandler(handler)
    root_logger.propagate = False

    # Silenciar logs excesivamente verbosos de librerías externas
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
