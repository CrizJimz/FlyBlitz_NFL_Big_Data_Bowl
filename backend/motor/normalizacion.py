"""Normalización del tracking: todas las jugadas atacan hacia x creciente."""

import numpy as np
import pandas as pd

from .config import ANCHO, LARGO

# Columnas de ángulo (grados) que se rotan 180 grados en jugadas "left".
COLUMNAS_ANGULO = ("o", "dir")

# Columnas que identifican una jugada en el reporte de filas excluidas.
COLUMNAS_JUGADA = ("gameId", "playId")


def _normalizar_angulo(angulo: pd.Series, izquierda: pd.Series) -> pd.Series:
    """Devuelve el ángulo en [0, 360); suma 180 donde `izquierda` es verdadero.

    Los nulos (p. ej. el balón) se conservan como nulos.
    """
    desplazamiento = np.where(izquierda, 180, 0).astype(angulo.dtype)
    return (angulo + desplazamiento) % 360


def _separar_sin_direccion(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Parte la tabla en filas con `playDirection` y jugadas sin dirección.

    Devuelve (filas con dirección, jugadas únicas sin dirección).
    No asume ninguna dirección para las filas sin dato.
    """
    sin_dir = df["playDirection"].isna()
    columnas = [c for c in COLUMNAS_JUGADA if c in df.columns]
    jugadas = df.loc[sin_dir, columnas].drop_duplicates().reset_index(drop=True)
    return df.loc[~sin_dir].copy(), jugadas


def normalizar_tracking(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Normaliza el tracking según `playDirection` (vectorizado, sin mutar `df`).

    - "left": x = 120 - x, y = 53.3 - y, o y dir = (ang + 180) % 360.
    - "right": coordenadas intactas; los ángulos solo se llevan a [0, 360).
    - Conserva filas fuera del campo y los nulos de `o`/`dir` del balón.
    - Las filas sin `playDirection` se excluyen y se devuelven en el segundo
      valor (`gameId`, `playId` únicos) para que el llamador las registre
      con `logging`.

    Devuelve (tracking_normalizado, jugadas_sin_direccion).
    """
    salida, jugadas_sin_direccion = _separar_sin_direccion(df)
    izquierda = salida["playDirection"] == "left"
    if "x" in salida.columns:
        salida["x"] = np.where(izquierda, LARGO - salida["x"], salida["x"])
    if "y" in salida.columns:
        salida["y"] = np.where(izquierda, ANCHO - salida["y"], salida["y"])
    for col in COLUMNAS_ANGULO:
        if col in salida.columns:
            salida[col] = _normalizar_angulo(salida[col], izquierda)
    return salida, jugadas_sin_direccion
