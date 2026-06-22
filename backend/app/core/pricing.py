"""
Tabla de precios por modelo de IA.
Precios en USD por millón de tokens (convertidos a EUR con tasa aproximada).
Actualizar según cambios en los precios de los proveedores.
"""
from dataclasses import dataclass

USD_TO_EUR = 0.92  # Tasa de conversión aproximada


@dataclass
class ModelPricing:
    input_per_million: float   # USD por millón de tokens de entrada
    output_per_million: float  # USD por millón de tokens de salida


PRICING_TABLE: dict[str, ModelPricing] = {
    # Claude (Anthropic)
    "claude-opus-4-6": ModelPricing(input_per_million=15.0, output_per_million=75.0),
    "claude-sonnet-4-6": ModelPricing(input_per_million=3.0, output_per_million=15.0),
    "claude-haiku-4-5-20251001": ModelPricing(input_per_million=0.8, output_per_million=4.0),
    # Modelo por defecto si el modelo no está en la tabla
    "default": ModelPricing(input_per_million=3.0, output_per_million=15.0),
}


def calculate_cost_eur(model_id: str, tokens_in: int, tokens_out: int) -> float:
    """
    Calcula el coste en EUR dado un modelo y los tokens consumidos.

    Args:
        model_id: Identificador del modelo (ej: "claude-sonnet-4-6")
        tokens_in: Tokens de entrada (prompt)
        tokens_out: Tokens de salida (respuesta)

    Returns:
        Coste total en EUR, redondeado a 6 decimales.
    """
    pricing = PRICING_TABLE.get(model_id, PRICING_TABLE["default"])

    cost_usd = (
        (tokens_in / 1_000_000) * pricing.input_per_million
        + (tokens_out / 1_000_000) * pricing.output_per_million
    )

    return round(cost_usd * USD_TO_EUR, 6)
