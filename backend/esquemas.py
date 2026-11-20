"""Modelos Pydantic de la API con las llaves exactas de contrato-api.md.

Por ahora solo contiene los modelos de ``GET /api/filtros``.
"""

import math
from typing import Any

import numpy as np
from pydantic import BaseModel


def nan_a_none(valor: Any) -> Any:
    """Convierte recursivamente ``NaN`` a ``None`` y tipos numpy a tipos Python.

    Recorre dicts, listas y tuplas. Los ``float`` (Python o numpy) con valor
    ``NaN`` pasan a ``None``; ``np.integer``, ``np.floating`` y ``np.bool_``
    pasan a ``int``, ``float`` y ``bool``; los ``ndarray`` pasan a lista.
    """
    if isinstance(valor, dict):
        return {k: nan_a_none(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [nan_a_none(v) for v in valor]
    if isinstance(valor, np.ndarray):
        return [nan_a_none(v) for v in valor.tolist()]
    if isinstance(valor, np.bool_):
        return bool(valor)
    if isinstance(valor, np.integer):
        return int(valor)
    if isinstance(valor, (float, np.floating)):
        numero = float(valor)
        return None if math.isnan(numero) else numero
    return valor


class RangoDistancia(BaseModel):
    """Rango de yardas por ganar; ``max`` es ``None`` en el rango abierto."""

    clave: str
    min: int
    max: int | None = None


class FiltrosRespuesta(BaseModel):
    """Catálogo de valores disponibles para filtrar (``GET /api/filtros``)."""

    equipos: list[str]
    semanas: list[int]
    downs: list[int]
    rangos_distancia: list[RangoDistancia]
    tipos_cobertura: list[str]
    coberturas: list[str]
    formaciones: list[str]
