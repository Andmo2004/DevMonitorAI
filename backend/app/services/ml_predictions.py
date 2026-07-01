"""
Servicio de predicciones ML para series temporales de uso de IA.

Utiliza Facebook Prophet para generar predicciones
de tokens y coste a 7 y 15 días, con intervalos de confianza.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import pandas as pd
from prophet import Prophet
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import AIEvent
from app.schemas.prediction import (
    PredictionPoint,
    PredictionSeries,
    PredictionResponse,
)

# Suprimir logs verbosos de Prophet/CmdStanPy
logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").disabled = True


async def _fetch_daily_aggregates(
    db: AsyncSession,
    user_id: int | None = None,
    days_history: int = 30,
) -> list[dict]:
    """
    Obtiene tokens y coste agregados por día desde ai_events.

    Rellena los días sin eventos con 0 en vez de omitirlos: si se omiten,
    Prophet ve "menos días entre medias" en lugar de "actividad cero", lo
    que distorsiona la tendencia y le impide aprender bien la estacionalidad
    semanal (p. ej. fines de semana con menos uso).

    Returns:
        Lista de dicts con {date: str, tokens: int, cost_eur: float}
        ordenada cronológicamente, sin huecos.
    """
    # Limit history to a maximum of 60 days (2 months) for ML performance
    effective_days = min(days_history, 60)
    since = datetime.now(tz=timezone.utc) - timedelta(days=effective_days)

    query = select(AIEvent).where(AIEvent.timestamp >= since)
    if user_id is not None:
        query = query.where(AIEvent.user_id == user_id)
    query = query.order_by(AIEvent.timestamp)

    result = await db.execute(query)
    events = result.scalars().all()

    daily: dict[str, dict] = defaultdict(lambda: {"tokens": 0, "cost_eur": 0.0})
    for event in events:
        day_key = event.timestamp.strftime("%Y-%m-%d")
        daily[day_key]["tokens"] += event.tokens_in + event.tokens_out
        daily[day_key]["cost_eur"] += event.cost_eur

    if not daily:
        return []

    # Reindexar al rango completo [primer día con datos, último día con datos]
    # para que los días sin eventos entren como 0 en vez de desaparecer.
    full_range = pd.date_range(min(daily), max(daily), freq="D")
    for d in full_range:
        _ = daily[d.strftime("%Y-%m-%d")]  # defaultdict: crea {tokens:0, cost_eur:0.0} si falta

    return [
        {"date": day, "tokens": d["tokens"], "cost_eur": round(d["cost_eur"], 6)}
        for day, d in sorted(daily.items())
    ]


def _build_prediction_series(
    daily_data: list[dict],
    metric_key: str,
    unit: str,
    forecast_days: int = 15,
    real_tail: int = 2,
) -> PredictionSeries:
    """
    Entrena Prophet sobre la serie histórica y genera predicciones.

    Args:
        daily_data: Datos diarios agregados (sin huecos).
        metric_key: Clave del dict ('tokens' o 'cost_eur').
        unit: Unidad de medida para la serie.
        forecast_days: Días de predicción a generar.
        real_tail: Últimos N días reales a incluir en la respuesta.

    Returns:
        PredictionSeries con puntos reales + predicciones.
    """
    if len(daily_data) < 2:
        # Sin datos suficientes, devolver serie vacía con puntos a cero
        today = datetime.now(tz=timezone.utc).date()
        points = [
            PredictionPoint(
                date=(today + timedelta(days=i)).isoformat(),
                value=0.0,
                upper_bound=0.0,
                lower_bound=0.0,
                is_prediction=True,
            )
            for i in range(forecast_days)
        ]
        return PredictionSeries(metric=metric_key, unit=unit, points=points)

    # Preparar DataFrame
    df = pd.DataFrame([
        {"ds": d["date"], "y": d[metric_key]}
        for d in daily_data
    ])
    df["ds"] = pd.to_datetime(df["ds"])

    try:
        # Entrenar Prophet de verdad. yearly_seasonality se desactiva porque el
        # histórico está limitado a 60 días (no hay ni un ciclo anual completo);
        # weekly_seasonality="auto" se activa sola si hay >= ~2 semanas de datos.
        # interval_width=0.9 para que las bandas coincidan con confidence_level=0.9.
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality="auto",
            daily_seasonality=False,
            interval_width=0.9,
        )
        model.fit(df)

        future = model.make_future_dataframe(periods=forecast_days, freq="D")
        forecast = model.predict(future)[["ds", "yhat", "yhat_upper", "yhat_lower"]]
        # Unimos el valor real (si existe) a cada fecha; las fechas futuras
        # quedan con y = NaN, que es justo lo que usamos para distinguirlas.
        forecast = forecast.merge(df, on="ds", how="left")
    except Exception as e:
        import logging
        logging.getLogger("prophet_fallback").warning(f"Prophet falló ({e}), usando fallback de patrón semanal")
        # Fallback: repetir el patrón de los últimos 7 días para mantener "valles y montañas"
        last_date = df["ds"].max()
        future_dates = [last_date + timedelta(days=i) for i in range(1, forecast_days + 1)]
        
        if len(df) >= 7:
            last_7 = df["y"].tail(7).values
            future_yhat = [last_7[i % 7] for i in range(forecast_days)]
        else:
            mean_y = df["y"].mean()
            future_yhat = [mean_y] * forecast_days
        
        future_df = pd.DataFrame({"ds": future_dates, "yhat": future_yhat})
        future_df["yhat_upper"] = future_df["yhat"] * 1.1
        future_df["yhat_lower"] = future_df["yhat"] * 0.9
        
        forecast = pd.concat([
            df.rename(columns={"y": "yhat"}).assign(
                yhat_upper=lambda x: x["yhat"], 
                yhat_lower=lambda x: x["yhat"]
            ), 
            future_df
        ]).reset_index(drop=True)
        forecast = forecast.merge(df, on="ds", how="left")

    points: list[PredictionPoint] = []

    # Queremos incluir los últimos 'real_tail' días reales, y todos los futuros.
    start_idx = max(len(daily_data) - real_tail, 0)

    for i in range(start_idx, len(forecast)):
        row = forecast.iloc[i]
        date_str = row["ds"].strftime("%Y-%m-%d")

        is_prediction = pd.isna(row["y"])

        if not is_prediction:
            # Para datos reales, usamos el valor exacto de la base de datos
            # y las bandas que predijo el modelo para ese momento, ampliadas
            # si hiciera falta para que el punto real siempre quede dentro.
            actual_val = float(row["y"])
            upper = max(actual_val, float(row["yhat_upper"]))
            lower = min(actual_val, float(row["yhat_lower"]))

            points.append(
                PredictionPoint(
                    date=date_str,
                    value=round(actual_val, 4),
                    upper_bound=round(float(upper), 4),
                    lower_bound=round(float(max(lower, 0)), 4),
                    is_prediction=False,
                )
            )
        else:
            # Para datos predichos, usamos yhat, yhat_upper, yhat_lower
            pred_val = float(row["yhat"])
            upper = float(row["yhat_upper"])
            lower = float(row["yhat_lower"])

            points.append(
                PredictionPoint(
                    date=date_str,
                    value=round(float(max(pred_val, 0)), 4),
                    upper_bound=round(float(max(upper, 0)), 4),
                    lower_bound=round(float(max(lower, 0)), 4),
                    is_prediction=True,
                )
            )

    return PredictionSeries(metric=metric_key, unit=unit, points=points)

# --- Caché TTL simple para predicciones ---
_prediction_cache: dict[tuple, tuple[float, "PredictionResponse"]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutos


async def generate_predictions(
    db: AsyncSession,
    user_id: int | None = None,
    days_history: int = 30,
) -> PredictionResponse:
    """
    Genera predicciones para tokens y coste usando Prophet.
    Resultados cacheados durante 5 minutos por (user_id, days_history).

    Args:
        db: Sesión de base de datos asíncrona.
        user_id: ID del usuario (None = global).
        days_history: Días de historia a usar para entrenar el modelo.

    Returns:
        PredictionResponse con series de tokens y coste.
    """
    import time

    cache_key = (user_id, days_history)
    now = time.monotonic()

    # Verificar caché
    if cache_key in _prediction_cache:
        cached_time, cached_result = _prediction_cache[cache_key]
        if now - cached_time < _CACHE_TTL_SECONDS:
            return cached_result

    daily_data = await _fetch_daily_aggregates(db, user_id, days_history)

    # _build_prediction_series es CPU-bound. Prophet/cmdstanpy a menudo falla
    # con errores de concurrencia al ejecutarse en paralelo (asyncio.gather) 
    # porque sobrescriben los mismos archivos temporales de compilación.
    # Los lanzamos secuencialmente en to_thread para no bloquear el event loop.
    tokens_series = await asyncio.to_thread(
        _build_prediction_series, daily_data, "tokens", "tokens", 15, 2
    )
    cost_series = await asyncio.to_thread(
        _build_prediction_series, daily_data, "cost_eur", "EUR", 15, 2
    )

    result = PredictionResponse(
        tokens=tokens_series,
        cost=cost_series,
        model_used="Prophet",
        confidence_level=0.9,
    )

    # Guardar en caché
    _prediction_cache[cache_key] = (now, result)

    return result