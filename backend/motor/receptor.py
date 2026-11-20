"""Identificación del receptor objetivo a partir de `playDescription` (sin tracking)."""

import re

import numpy as np
import pandas as pd

from .config import PASE_CON_BALON

# Regex validada del diseño: no se modifica.
RE_RECEPTOR = re.compile(
    r"\bpass\b[^()]*?\b(?:to|intended for)\s+([A-Z][A-Za-z]*\.(?:[A-Z]\.)?\s?[A-Z][A-Za-z'\-]+)"
)

# Sufijos de nombre que no cuentan como apellido.
SUFIJOS = {"jr", "sr", "ii", "iii", "iv", "v"}


def _solo_letras(texto: str) -> str:
    """Minúsculas y solo letras a-z."""
    return re.sub(r"[^a-z]", "", str(texto).lower())


def extraer_nombre_receptor(descripcion) -> str | None:
    """Devuelve el nombre abreviado del receptor (p. ej. 'T.Hill') o None si no hay."""
    if not isinstance(descripcion, str):
        return None
    m = RE_RECEPTOR.search(descripcion)
    return m.group(1) if m else None


def partir_nombre(nombre_abreviado: str) -> tuple[str, str]:
    """Separa 'T.Hill' en (inicial, apellido normalizado): inicial = primera letra;
    apellido = texto tras el último punto, en minúsculas y solo letras."""
    inicial = _solo_letras(nombre_abreviado[:1])
    apellido = _solo_letras(nombre_abreviado.rsplit(".", 1)[-1])
    return inicial, apellido


def apellido_oficial(display_name: str) -> tuple[str, str]:
    """Devuelve (inicial, apellido normalizado) de un `displayName` completo.

    El apellido es el último token que no sea un sufijo (jr, sr, ii, iii, iv, v).
    """
    texto = str(display_name).strip()
    inicial = _solo_letras(texto[:1])
    tokens = [t for t in texto.split() if _solo_letras(t) not in SUFIJOS]
    apellido = _solo_letras(tokens[-1]) if tokens else ""
    return inicial, apellido


def _normalizar_serie(nombres: pd.Series, f) -> pd.DataFrame:
    """Aplica `f` (tupla inicial, apellido) una vez por valor único y devuelve dos columnas."""
    unicos = nombres.dropna().unique()
    tabla = pd.DataFrame(
        [f(n) for n in unicos], columns=["inicial", "apellido"], index=unicos
    )
    return tabla.reindex(nombres).set_axis(nombres.index)


def resolver_receptores(
    plays: pd.DataFrame, rutas: pd.DataFrame, players: pd.DataFrame | None = None
) -> pd.Series:
    """Devuelve el `nflId` del receptor objetivo por jugada (índice de `plays`), o NaN.

    `rutas`: filas con `gameId`, `playId`, `nflId`, `pff_role` (se filtra `Pass Route`).
    Si no trae `displayName`, se une con `players` por `nflId`.
    Solo se resuelven jugadas C/I/IN. Se cruza por apellido; con varios candidatos se
    desempata por inicial; si no queda exactamente uno, el resultado es NaN.
    """
    salida = pd.Series(np.nan, index=plays.index, dtype="float64", name="receptor_nfl_id")

    # Jugadas con balón lanzado y su nombre abreviado.
    objetivo = plays.loc[plays["passResult"].astype(str).isin(PASE_CON_BALON),
                         ["gameId", "playId", "playDescription"]].copy()
    nombre = objetivo["playDescription"].map(extraer_nombre_receptor)
    objetivo = objetivo[nombre.notna()]
    if objetivo.empty:
        return salida
    ini_ap = _normalizar_serie(nombre[objetivo.index], partir_nombre)
    objetivo["ini"], objetivo["ape"] = ini_ap["inicial"], ini_ap["apellido"]
    objetivo["idx"] = objetivo.index

    # Candidatos: jugadores de ruta de pase con nombre oficial.
    cand = rutas.loc[rutas["pff_role"].astype(str) == "Pass Route", ["gameId", "playId", "nflId"]]
    if "displayName" in rutas.columns:
        cand = cand.assign(displayName=rutas.loc[cand.index, "displayName"])
    else:
        cand = cand.merge(players[["nflId", "displayName"]].drop_duplicates("nflId"),
                          on="nflId", how="inner")
    cand = cand.dropna(subset=["displayName"])
    oficial = _normalizar_serie(cand["displayName"], apellido_oficial)
    cand = cand.assign(c_ini=oficial["inicial"].to_numpy(), c_ape=oficial["apellido"].to_numpy())

    # Cruce por jugada y apellido.
    m = objetivo.merge(cand, on=["gameId", "playId"], how="inner")
    m = m[m["ape"] == m["c_ape"]]
    n_ape = m.groupby("idx")["nflId"].transform("size")
    # Con varios candidatos, desempata por inicial.
    m = m[(n_ape == 1) | (m["ini"] == m["c_ini"])]
    n_final = m.groupby("idx")["nflId"].transform("size")
    unico = m[n_final == 1]
    salida.loc[unico["idx"].to_numpy()] = unico["nflId"].to_numpy(dtype="float64")
    return salida

