"""Catálogo de filtros del motor de datos (valores únicos reales de los CSV)."""

import pandas as pd

from .carga import TablasBase
from .config import RANGOS_DISTANCIA

# Downs válidos: 0 son conversiones de 2 puntos y no se ofrecen como filtro.
DOWNS_VALIDOS = (1, 2, 3, 4)


def _unicos_texto(*series: pd.Series) -> list[str]:
    """Valores únicos no nulos (como texto) de una o varias series, ordenados."""
    unidos = pd.concat([s.astype("object") for s in series], ignore_index=True)
    return sorted(str(v) for v in unidos.dropna().unique())


def _equipos(tablas: TablasBase) -> list[str]:
    """Equipos que aparecen como ofensiva o defensiva en las jugadas."""
    plays = tablas.plays
    return _unicos_texto(plays["possessionTeam"], plays["defensiveTeam"])


def _semanas(tablas: TablasBase) -> list[int]:
    """Semanas distintas de `games.week`, ordenadas."""
    return sorted(int(s) for s in tablas.games["week"].dropna().unique())


def _downs(tablas: TablasBase) -> list[int]:
    """Downs presentes en las jugadas, limitados a 1-4 (excluye el 0)."""
    presentes = {int(d) for d in tablas.plays["down"].dropna().unique()}
    return [d for d in DOWNS_VALIDOS if d in presentes]


def _rangos_distancia() -> list[dict]:
    """Rangos de distancia fijos (convención del equipo); `larga` no tiene máximo."""
    return [
        {"clave": clave, "min": minimo, "max": maximo}
        for clave, (minimo, maximo) in RANGOS_DISTANCIA.items()
    ]


def construir_catalogo(tablas: TablasBase) -> dict:
    """Arma el catálogo de `GET /api/filtros` con las llaves exactas del contrato.

    Las listas salen de valores únicos reales (sin nulos) y van ordenadas de
    forma estable; solo `rangos_distancia` es fijo.
    """
    plays = tablas.plays
    return {
        "equipos": _equipos(tablas),
        "semanas": _semanas(tablas),
        "downs": _downs(tablas),
        "rangos_distancia": _rangos_distancia(),
        "tipos_cobertura": _unicos_texto(plays["pff_passCoverageType"]),
        "coberturas": _unicos_texto(plays["pff_passCoverage"]),
        "formaciones": _unicos_texto(plays["offenseFormation"]),
    }
