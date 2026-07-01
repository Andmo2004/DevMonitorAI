"""
Configuración de rate limiting para la API.

Usa slowapi (wrapper de limits) para limitar peticiones por IP,
especialmente en endpoints que consumen APIs de pago (Anthropic).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Limiter global: identifica clientes por IP
limiter = Limiter(key_func=get_remote_address)
