"""Separación receptor-defensor y velocidades `s` en el cuadro del pase.

Puro pandas/numpy: no lee ni escribe archivos. El cuadro de pase y el receptor
llegan como datos (los calculan otros módulos).
"""

import numpy as np
import pandas as pd

COLUMNAS_SALIDA = ["separacion_yd", "vel_receptor", "vel_defensor"]


def separacion_en_cuadro(
    jugadores_cuadro: pd.DataFrame, receptor_id: float, ids_cobertura
) -> tuple[float, float, float]:
    """Separación mínima y velocidades en un cuadro de una jugada.

    `jugadores_cuadro` tiene `nflId`, `x`, `y`, `s` (una fila por jugador en
    ese cuadro). Devuelve `(separacion, vel_receptor, vel_defensor)` con la
    distancia euclidiana mínima del receptor a los defensores de `ids_cobertura`
    y las velocidades `s` del receptor y de ese defensor. Si el receptor o
    ningún defensor de cobertura está en el cuadro, devuelve NaN en los tres.
    """
    nan = (np.nan, np.nan, np.nan)
    if receptor_id is None or pd.isna(receptor_id) or jugadores_cuadro.empty:
        return nan
    receptor = jugadores_cuadro[jugadores_cuadro["nflId"] == receptor_id]
    defensores = jugadores_cuadro[jugadores_cuadro["nflId"].isin(list(ids_cobertura))]
    # El receptor no puede ser su propio defensor.
    defensores = defensores[defensores["nflId"] != receptor_id]
    if receptor.empty or defensores.empty:
        return nan
    r = receptor.iloc[0]
    dist = np.hypot(defensores["x"].to_numpy(float) - r["x"], defensores["y"].to_numpy(float) - r["y"])
    i = int(np.argmin(dist))  # ante empate, el primero en el orden recibido
    return float(dist[i]), float(r["s"]), float(defensores["s"].iloc[i])


def separaciones_partido(
    trk_pase: pd.DataFrame, receptores: pd.DataFrame, cobertura: pd.DataFrame
) -> pd.DataFrame:
    """Separación y velocidades de todas las jugadas de un partido, vectorizado.

    Entradas:
    - `trk_pase`: tracking del partido con `playId`, `nflId`, `frameId`, `x`, `y`, `s`.
    - `receptores`: `playId`, `cuadro_pase`, `receptor_nfl_id` (una fila por jugada).
    - `cobertura`: `playId`, `nflId` de los defensores con `pff_role == "Coverage"`.

    Devuelve un DataFrame indexado por `playId` (una fila por jugada de
    `receptores`) con `separacion_yd`, `vel_receptor` y `vel_defensor`; NaN si no
    hay cuadro, receptor o defensor en ese cuadro.
    """
    jugadas = receptores[["playId", "cuadro_pase", "receptor_nfl_id"]].drop_duplicates("playId")
    salida = pd.DataFrame(
        np.nan, index=pd.Index(jugadas["playId"].to_numpy(), name="playId"), columns=COLUMNAS_SALIDA
    )
    validas = jugadas.dropna(subset=["cuadro_pase", "receptor_nfl_id"])
    if validas.empty:
        return salida

    # Solo las filas del cuadro de pase de cada jugada (~23 por jugada).
    cols = ["playId", "frameId", "nflId", "x", "y", "s"]
    en_cuadro = trk_pase[cols].dropna(subset=["nflId"]).merge(
        validas.rename(columns={"cuadro_pase": "frameId"})[["playId", "frameId"]],
        on=["playId", "frameId"],
    )
    en_cuadro["nflId"] = en_cuadro["nflId"].astype("float64")

    rec = validas.assign(nflId=validas["receptor_nfl_id"].astype("float64"))[["playId", "nflId"]]
    rec = rec.merge(en_cuadro, on=["playId", "nflId"])[["playId", "x", "y", "s"]]
    rec.columns = ["playId", "x_r", "y_r", "s_r"]

    defs = cobertura[["playId", "nflId"]].drop_duplicates().astype({"nflId": "float64"})
    defs = defs.merge(en_cuadro, on=["playId", "nflId"])
    defs = defs.merge(rec, on="playId")
    # El receptor no cuenta como defensor propio.
    defs = defs.merge(
        validas.assign(nflId=validas["receptor_nfl_id"].astype("float64"))[["playId", "nflId"]],
        on=["playId", "nflId"], how="left", indicator=True,
    )
    defs = defs[defs["_merge"] == "left_only"]
    if defs.empty:
        return salida

    defs = defs.sort_values(["playId", "nflId"]).reset_index(drop=True)
    defs["dist"] = np.hypot(defs["x"] - defs["x_r"], defs["y"] - defs["y_r"])
    cercano = defs.loc[defs.groupby("playId")["dist"].idxmin()].set_index("playId")
    salida.loc[cercano.index, "separacion_yd"] = cercano["dist"].to_numpy()
    salida.loc[cercano.index, "vel_receptor"] = cercano["s_r"].to_numpy(float)
    salida.loc[cercano.index, "vel_defensor"] = cercano["s"].to_numpy(float)
    return salida
