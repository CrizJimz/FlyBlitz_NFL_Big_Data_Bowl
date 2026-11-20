"""Lectura de solo lectura de los CSV de `data/`: tablas base y tracking de un partido."""

import re
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .config import DIR_DATOS

# Columnas usadas de cada tabla base (verificadas contra el encabezado real).
# `birthDate` y `collegeName` no se usan, así que no se leen ni se parsean.
COLUMNAS_GAMES = ["gameId", "week", "gameDate", "homeTeamAbbr", "visitorTeamAbbr"]
COLUMNAS_PLAYS = [
    "gameId", "playId", "playDescription", "quarter", "down", "yardsToGo",
    "possessionTeam", "defensiveTeam", "gameClock", "passResult",
    "prePenaltyPlayResult", "playResult", "offenseFormation", "dropBackType",
    "pff_playAction", "pff_passCoverage", "pff_passCoverageType",
]
COLUMNAS_PLAYERS = ["nflId", "height", "weight", "officialPosition", "displayName"]
COLUMNAS_PFF = [
    "gameId", "playId", "nflId", "pff_role", "pff_positionLinedUp",
    "pff_hit", "pff_hurry", "pff_sack",
]

# Tipos reducidos para las tablas base (solo columnas sin nulos o con float).
DTYPES_PLAYS = {
    "gameId": "int64", "playId": "int32", "quarter": "int8", "down": "int8",
    "yardsToGo": "int16", "prePenaltyPlayResult": "int16", "playResult": "int16",
    "pff_playAction": "int8",
    "possessionTeam": "category", "defensiveTeam": "category",
    "passResult": "category", "offenseFormation": "category",
    "dropBackType": "category", "pff_passCoverage": "category",
    "pff_passCoverageType": "category",
}
DTYPES_PFF = {
    "gameId": "int64", "playId": "int32", "nflId": "int32",
    "pff_role": "category", "pff_positionLinedUp": "category",
    "pff_hit": "float32", "pff_hurry": "float32", "pff_sack": "float32",
}

# Tipos reducidos del tracking. `gameId` no se lee: sale del nombre del archivo.
DTYPES_TRACKING = {
    "playId": "int32", "nflId": "float32", "frameId": "int16",
    "x": "float64", "y": "float64", "s": "float32", "a": "float32",
    "o": "float32", "dir": "float32", "jerseyNumber": "float32",
    "team": "category", "event": "category", "playDirection": "category",
}

# Columnas del tracking que usa el precálculo.
COLUMNAS_TRACKING_PRECALCULO = ["playId", "nflId", "frameId", "x", "y", "s", "event", "playDirection"]

_RE_TRACKING = re.compile(r"^tracking_(\d+)\.csv$")


class ArchivoFaltante(FileNotFoundError):
    """Se lanza cuando falta un CSV requerido; `nombre` es el archivo ausente."""

    def __init__(self, nombre: str):
        super().__init__(nombre)
        self.nombre = nombre


@dataclass
class TablasBase:
    """Tablas base en memoria (todas de solo lectura)."""

    games: pd.DataFrame
    plays: pd.DataFrame
    players: pd.DataFrame
    pff: pd.DataFrame


def _leer_csv(ruta: Path, columnas: list[str], dtypes: dict | None = None) -> pd.DataFrame:
    """Lee un CSV con `usecols`; lanza `ArchivoFaltante` si no existe."""
    if not ruta.is_file():
        raise ArchivoFaltante(ruta.name)
    dtypes = {c: t for c, t in (dtypes or {}).items() if c in columnas}
    return pd.read_csv(ruta, usecols=columnas, dtype=dtypes)


def leer_tablas_base(dir_datos: Path = DIR_DATOS) -> TablasBase:
    """Carga games, plays, players y pffScoutingData con columnas y tipos reducidos."""
    dir_datos = Path(dir_datos)
    return TablasBase(
        games=_leer_csv(dir_datos / "games.csv", COLUMNAS_GAMES),
        plays=_leer_csv(dir_datos / "plays.csv", COLUMNAS_PLAYS, DTYPES_PLAYS),
        players=_leer_csv(dir_datos / "players.csv", COLUMNAS_PLAYERS),
        pff=_leer_csv(dir_datos / "pffScoutingData.csv", COLUMNAS_PFF, DTYPES_PFF),
    )


def listar_partidos(dir_datos: Path = DIR_DATOS, games: pd.DataFrame | None = None) -> list[int]:
    """Devuelve los `gameId` de `tracking/tracking_*.csv`, ordenados.

    Si se pasa `games`, contrasta: un partido de `games` sin tracking lanza
    `ArchivoFaltante` (omitirlo dejaría sus jugadas sin snap en silencio).
    """
    carpeta = Path(dir_datos) / "tracking"
    if not carpeta.is_dir():
        raise ArchivoFaltante("tracking")
    ids = sorted(int(m.group(1)) for p in carpeta.iterdir() if (m := _RE_TRACKING.match(p.name)))
    if games is not None:
        for faltante in sorted(set(games["gameId"]) - set(ids)):
            raise ArchivoFaltante(f"tracking_{faltante}.csv")
    return ids


def leer_tracking_partido(
    game_id: int, dir_datos: Path = DIR_DATOS, columnas: list[str] | None = None
) -> pd.DataFrame:
    """Lee el tracking de UN partido con `usecols` y tipos reducidos.

    `gameId` se agrega desde el nombre del archivo (no se lee del CSV).
    """
    ruta = Path(dir_datos) / "tracking" / f"tracking_{int(game_id)}.csv"
    columnas = list(columnas or COLUMNAS_TRACKING_PRECALCULO)
    desconocidas = [c for c in columnas if c not in DTYPES_TRACKING]
    if desconocidas:
        raise ValueError(f"Columnas de tracking no soportadas: {desconocidas}")
    df = _leer_csv(ruta, columnas, DTYPES_TRACKING)
    df.insert(0, "gameId", int(game_id))
    return df
