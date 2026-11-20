"""Success rate: rango de distancia, clasificación de éxito y resumen de tasa."""

import pandas as pd

from .config import RANGOS_DISTANCIA


def rango_distancia(yardas_por_avanzar: pd.Series) -> pd.Series:
    """Asigna `corta`, `media` o `larga` según yardsToGo.

    Devuelve nulo cuando yardsToGo es nulo o menor que 1.
    """
    resultado = pd.Series(pd.NA, index=yardas_por_avanzar.index, dtype="object")
    for nombre, (minimo, maximo) in RANGOS_DISTANCIA.items():
        mascara = yardas_por_avanzar >= minimo
        if maximo is not None:
            mascara &= yardas_por_avanzar <= maximo
        resultado[mascara] = nombre
    return resultado


def es_exitosa(
    down: pd.Series,
    yardas_por_avanzar: pd.Series,
    pre_penalty: pd.Series,
    resultado_pase: pd.Series,
) -> pd.Series:
    """Clasifica cada jugada como exitosa (True) o fallida (False).

    Usa aritmética entera para evitar errores de punto flotante:
    down 1: 5*pre >= 2*ytg; down 2: 5*pre >= 3*ytg; downs 3-4: pre >= ytg.
    Una intercepción (`IN`) siempre es fallida. Un down fuera de 1-4 o un
    dato nulo da False; el llamador filtra con `down_valido`.
    """
    pre = pre_penalty
    ytg = yardas_por_avanzar
    exito = (
        ((down == 1) & (5 * pre >= 2 * ytg))
        | ((down == 2) & (5 * pre >= 3 * ytg))
        | (down.isin([3, 4]) & (pre >= ytg))
    )
    exito &= resultado_pase != "IN"
    return exito.fillna(False).astype(bool)


def resumen_tasa(exitosa: pd.Series) -> dict:
    """Resume una serie booleana en `{"n", "exitosas", "tasa"}`.

    Con n == 0 devuelve tasa 0.0 sin dividir.
    """
    n = int(len(exitosa))
    exitosas = int(exitosa.sum())
    tasa = float(exitosas / n) if n > 0 else 0.0
    return {"n": n, "exitosas": exitosas, "tasa": tasa}
