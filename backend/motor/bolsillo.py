"""Cuadros de snap y pase, categoría del bolsillo, tiempo de bolsillo y presión PFF.

Todas las funciones son puras y vectorizadas: no escriben archivos ni modifican la entrada.
"""

import numpy as np
import pandas as pd

from .config import FPS, PASE_CON_BALON


def primer_cuadro_evento(eventos: pd.DataFrame, nombres: str | tuple[str, ...]) -> pd.Series:
    """Devuelve el primer `frameId` (mínimo) por jugada de los eventos indicados.

    `eventos` debe traer `playId`, `frameId` y `event` (y opcionalmente `gameId`,
    que entonces forma parte de la llave). `nombres` es un evento o varios.
    El resultado queda indexado por la llave de jugada; sin eventos devuelve una serie vacía.
    """
    if isinstance(nombres, str):
        nombres = (nombres,)
    llave = [c for c in ("gameId", "playId") if c in eventos.columns]
    filas = eventos[eventos["event"].isin(list(nombres))]
    return filas.groupby(llave, observed=True)["frameId"].min().astype("float64")


def elegir_cuadro(primario: pd.Series, respaldo: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Toma el cuadro primario y usa el de respaldo solo donde el primario falta.

    Devuelve `(cuadro, usa_respaldo)`: `cuadro` es float con NaN si faltan ambos y
    `usa_respaldo` es booleana (verdadera solo si se usó un respaldo existente).
    """
    respaldo = respaldo.reindex(primario.index) if not respaldo.index.equals(primario.index) else respaldo
    falta_primario = primario.isna()
    cuadro = primario.astype("float64").where(~falta_primario, respaldo.astype("float64"))
    usa_respaldo = falta_primario & respaldo.notna()
    return cuadro, usa_respaldo


def categoria_bolsillo(resultado_pase: pd.Series, snap: pd.Series, pase: pd.Series) -> pd.Series:
    """Clasifica cada jugada como `con_pase`, `sin_pase` o `sin_snap`.

    - Sin cuadro de snap: `sin_snap` (nunca se supone el cuadro 1).
    - Con snap, `passResult` en C/I/IN y cuadro de pase: `con_pase`.
    - Cualquier otro caso (S y R siempre, o C/I/IN sin pase): `sin_pase`.
    La decisión usa `passResult`, no la mera presencia del evento de pase.
    """
    hay_snap = snap.notna()
    lanzo = resultado_pase.astype("object").isin(PASE_CON_BALON) & pase.notna()
    return pd.Series(
        np.select([~hay_snap, lanzo], ["sin_snap", "con_pase"], default="sin_pase"),
        index=snap.index,
    )


def tiempo_bolsillo(snap: pd.Series, pase: pd.Series, categoria: pd.Series) -> pd.Series:
    """Tiempo de bolsillo en segundos: `(pase - snap) / FPS` solo para `con_pase`; NaN en el resto."""
    tiempo = (pase.astype("float64") - snap.astype("float64")) * (1 / FPS)
    return tiempo.where(categoria == "con_pase")


def presion_pff(pff: pd.DataFrame) -> pd.Series:
    """Indica por (gameId, playId) si algún jugador tiene `pff_hit`, `pff_hurry` o `pff_sack` igual a 1.

    Los nulos cuentan como 0. Devuelve una serie booleana indexada por (gameId, playId).
    """
    columnas = ["pff_hit", "pff_hurry", "pff_sack"]
    hay = (pff[columnas].fillna(0) == 1).any(axis=1)
    return hay.groupby([pff["gameId"], pff["playId"]]).any()
