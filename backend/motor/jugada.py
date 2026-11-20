"""Detalle cuadro a cuadro de una jugada, con coordenadas normalizadas.

Lee bajo demanda solo el tracking del partido pedido y lo guarda en una caché
pequeña en memoria (nunca en disco). No depende del precálculo completo: usa
solo las tablas base del estado del motor.
"""

import logging
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from .bolsillo import elegir_cuadro, primer_cuadro_evento
from .carga import ArchivoFaltante, leer_tracking_partido
from .config import DIR_DATOS, FPS, PASE
from .normalizacion import normalizar_tracking
from .receptor import resolver_receptores
from .separacion import separacion_en_cuadro

registro = logging.getLogger(__name__)

# Columnas del tracking que necesita el detalle (agrega dorsal, equipo y ángulos).
COLUMNAS_DETALLE = [
    "playId", "nflId", "frameId", "x", "y", "s", "o", "dir",
    "jerseyNumber", "team", "event", "playDirection",
]


@lru_cache(maxsize=4)
def tracking_partido_normalizado(game_id: int, dir_datos: Path = DIR_DATOS) -> pd.DataFrame | None:
    """Tracking normalizado de un partido; `None` si no existe su archivo.

    Caché en memoria de 4 partidos. Los DataFrames cacheados son compartidos:
    quien los use no debe modificarlos (trabajar sobre copias o filtros).
    """
    try:
        trk = leer_tracking_partido(game_id, dir_datos, COLUMNAS_DETALLE)
    except ArchivoFaltante:
        return None
    normalizado, sin_direccion = normalizar_tracking(trk)
    for play_id in sin_direccion["playId"]:
        registro.warning("Jugada sin playDirection: gameId=%s playId=%s", game_id, play_id)
    return normalizado


def _a_python(valor):
    """Convierte un valor de numpy/pandas a int/float/str de Python; NaN y nulos a `None`."""
    if valor is None or (not isinstance(valor, str) and pd.isna(valor)):
        return None
    if isinstance(valor, (np.integer,)):
        return int(valor)
    if isinstance(valor, (np.floating, float)):
        return float(valor)
    if isinstance(valor, np.bool_):
        return bool(valor)
    return valor


def _eventos_jugada(trk: pd.DataFrame) -> list[dict]:
    """Primer cuadro de cada tipo de evento, ordenado por `frame_id` y luego por nombre."""
    filas = trk.loc[trk["event"].notna(), ["frameId", "event"]]
    primeros = filas.groupby("event", observed=True)["frameId"].min()
    lista = [{"frame_id": int(f), "evento": str(e)} for e, f in primeros.items()]
    return sorted(lista, key=lambda d: (d["frame_id"], d["evento"]))


def _cuadro_de_pase(trk: pd.DataFrame) -> float:
    """Cuadro del pase: `pass_forward` y, solo si falta, `autoevent_passforward` (NaN si no hay)."""
    eventos = trk.loc[trk["event"].isin(PASE), ["playId", "frameId", "event"]]
    primario = primer_cuadro_evento(eventos, PASE[0])
    respaldo = primer_cuadro_evento(eventos, PASE[1])
    indice = primario.index.union(respaldo.index)
    if len(indice) == 0:
        return float("nan")
    cuadro, _ = elegir_cuadro(primario.reindex(indice), respaldo.reindex(indice))
    return float(cuadro.iloc[0])


def _receptor_objetivo(trk, tablas, game_id, play_id, fila_jugada, pff_jugada) -> dict | None:
    """Receptor nombrado en la descripción con su separación en el cuadro del pase, o `None`."""
    jugada = tablas.plays.loc[fila_jugada.index]
    receptor = resolver_receptores(jugada, pff_jugada, tablas.players).iloc[0]
    cuadro = _cuadro_de_pase(trk)
    if pd.isna(receptor) or pd.isna(cuadro):
        return None
    en_cuadro = trk.loc[trk["frameId"] == int(cuadro), ["nflId", "x", "y", "s"]].dropna(subset=["nflId"])
    ids_cobertura = pff_jugada.loc[pff_jugada["pff_role"].astype(str) == "Coverage", "nflId"]
    sep, _, _ = separacion_en_cuadro(en_cuadro, receptor, ids_cobertura.to_numpy())
    nombres = tablas.players.loc[tablas.players["nflId"] == receptor, "displayName"]
    return {
        "nfl_id": int(receptor),
        "nombre": _a_python(nombres.iloc[0]) if len(nombres) else None,
        "separacion_yd": _a_python(sep),
    }


def _lado(equipo, ofensiva: str, defensiva: str) -> str | None:
    """Lado del jugador según su equipo en el tracking."""
    if equipo == "football":
        return "balon"
    if equipo == ofensiva:
        return "ofensiva"
    if equipo == defensiva:
        return "defensiva"
    return None


def _tabla_jugadores(trk: pd.DataFrame, tablas, game_id: int, play_id: int) -> pd.DataFrame:
    """Tracking de la jugada con `nombre` (players) y `rol` (pff) unidos por `nflId`."""
    nombres = tablas.players[["nflId", "displayName"]].drop_duplicates("nflId")
    nombres = nombres.assign(nflId=nombres["nflId"].astype("float64"))
    pff = tablas.pff
    roles = pff.loc[(pff["gameId"] == game_id) & (pff["playId"] == play_id), ["nflId", "pff_role"]]
    roles = roles.drop_duplicates("nflId").assign(nflId=lambda d: d["nflId"].astype("float64"))
    df = trk.assign(nflId=trk["nflId"].astype("float64"), team=trk["team"].astype("object"))
    df = df.merge(nombres, on="nflId", how="left").merge(roles, on="nflId", how="left")
    # Orden estable: por cuadro; jugadores por nflId y el balón (sin nflId) al final.
    return df.sort_values(["frameId", "nflId"], na_position="last", kind="stable")


def _jugador(fila, ofensiva: str, defensiva: str) -> dict:
    """Arma el diccionario de un jugador en un cuadro (el balón lleva nulos)."""
    lado = _lado(fila.team, ofensiva, defensiva)
    if lado == "balon":
        return {"nfl_id": None, "nombre": None, "dorsal": None, "equipo": "football",
                "lado": "balon", "rol": None, "x": _a_python(fila.x), "y": _a_python(fila.y),
                "s": _a_python(fila.s), "o": None, "dir": None}
    dorsal = _a_python(fila.jerseyNumber)
    return {
        "nfl_id": None if pd.isna(fila.nflId) else int(fila.nflId),
        "nombre": _a_python(fila.displayName),
        "dorsal": None if dorsal is None else int(dorsal),
        "equipo": _a_python(fila.team), "lado": lado, "rol": _a_python(fila.pff_role),
        "x": _a_python(fila.x), "y": _a_python(fila.y), "s": _a_python(fila.s),
        "o": _a_python(fila.o), "dir": _a_python(fila.dir),
    }


def _frames(df: pd.DataFrame, ofensiva: str, defensiva: str) -> list[dict]:
    """Lista de cuadros con sus jugadores, ordenada por `frame_id`."""
    cuadros = []
    for frame_id, grupo in df.groupby("frameId", sort=True):
        jugadores = [_jugador(f, ofensiva, defensiva) for f in grupo.itertuples(index=False)]
        cuadros.append({"frame_id": int(frame_id), "jugadores": jugadores})
    return cuadros


def detalle_jugada(estado, game_id: int, play_id: int, dir_datos: Path = DIR_DATOS) -> dict | None:
    """Detalle de una jugada con la forma de `GET /api/jugada/{game_id}/{play_id}`.

    Usa solo las tablas base de `estado` y el tracking del partido pedido (caché
    pequeña). Devuelve `None` si la jugada o el partido no existen, o si faltan
    las tablas base. No lanza excepciones por jugadas inexistentes.
    """
    tablas = getattr(estado, "tablas", None)
    if tablas is None:
        return None
    plays = tablas.plays
    fila = plays[(plays["gameId"] == game_id) & (plays["playId"] == play_id)]
    if fila.empty:
        return None
    trk_partido = tracking_partido_normalizado(int(game_id), Path(dir_datos))
    if trk_partido is None:
        return None
    # La máscara crea una copia: la caché nunca se modifica.
    trk = trk_partido[trk_partido["playId"] == play_id]
    if trk.empty:
        return None

    p = fila.iloc[0]
    semana = tablas.games.loc[tablas.games["gameId"] == game_id, "week"]
    pff_jugada = tablas.pff[(tablas.pff["gameId"] == game_id) & (tablas.pff["playId"] == play_id)]
    ofensiva, defensiva = str(p["possessionTeam"]), str(p["defensiveTeam"])
    return {
        "game_id": int(game_id),
        "play_id": int(play_id),
        "descripcion": _a_python(p["playDescription"]),
        "semana": _a_python(semana.iloc[0]) if len(semana) else None,
        "down": _a_python(p["down"]),
        "yardas_por_avanzar": _a_python(p["yardsToGo"]),
        "ofensiva": ofensiva,
        "defensiva": defensiva,
        "resultado_pase": _a_python(p["passResult"]),
        # Yardas antes de castigos, coherente con el Success Rate.
        "resultado_yardas": _a_python(p["prePenaltyPlayResult"]),
        "cobertura": _a_python(p["pff_passCoverage"]),
        "tipo_cobertura": _a_python(p["pff_passCoverageType"]),
        "play_action": bool(p["pff_playAction"] == 1),
        "frames_por_segundo": FPS,
        "eventos": _eventos_jugada(trk),
        "receptor_objetivo": _receptor_objetivo(trk, tablas, game_id, play_id, fila, pff_jugada),
        "frames": _frames(_tabla_jugadores(trk, tablas, game_id, play_id), ofensiva, defensiva),
    }
