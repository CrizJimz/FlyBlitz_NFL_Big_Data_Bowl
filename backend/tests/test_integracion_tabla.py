"""Prueba de integración de `tabla_jugadas` con los datos reales (tarea 8.4)."""

import pandas as pd
import pytest

from backend.motor.carga import leer_tracking_partido, listar_partidos
from backend.motor.config import PASE_CON_BALON


@pytest.fixture(scope="module")
def tabla(motor_real) -> pd.DataFrame:
    """Tabla por jugada del motor de sesión."""
    return motor_real.tabla_jugadas


def test_jugadas_sin_llaves_duplicadas(tabla):
    """8,557 jugadas y ninguna llave (game_id, play_id) repetida."""
    assert len(tabla) == 8557
    assert not tabla.duplicated(["game_id", "play_id"]).any()


def test_particion_bolsillo(tabla):
    """con_pase + sin_pase + sin_snap = 7,541 + 992 + 24 = 8,557."""
    cuenta = tabla["categoria_bolsillo"].astype(str).value_counts()
    assert cuenta["con_pase"] == 7541
    assert cuenta["sin_pase"] == 992
    assert cuenta["sin_snap"] == 24
    assert cuenta.sum() == 8557


def test_desglose_sin_pase(tabla):
    """sin_pase = 542 S, 447 R y 3 C/I (pase lanzado sin cuadro de pase)."""
    sin_pase = tabla[tabla["categoria_bolsillo"].astype(str) == "sin_pase"]
    por_resultado = sin_pase["resultado_pase"].value_counts()
    assert por_resultado["S"] == 542
    assert por_resultado["R"] == 447
    assert sin_pase["resultado_pase"].isin(["C", "I"]).sum() == 3


def test_jugadas_down_cero(tabla):
    """35 jugadas con down 0 (marcadas como no válidas)."""
    assert (tabla["down"] == 0).sum() == 35
    assert (~tabla["down_valido"]).sum() == 35


def test_separacion_medida_y_sin_receptor(tabla):
    """7,240 con separación; 325 sin ella (322 sin receptor identificable, 3 sin cuadro de pase)."""
    lanzadas = tabla[tabla["resultado_pase"].isin(PASE_CON_BALON)]
    sin_sep = lanzadas[lanzadas["separacion_yd"].isna()]
    no_identificados = sin_sep["receptor_nfl_id"].isna()
    sin_cuadro = sin_sep["receptor_nfl_id"].notna() & sin_sep["cuadro_pase"].isna()
    print(f"\n[separacion] medidas={lanzadas['separacion_yd'].notna().sum()} "
          f"sin_sep={len(sin_sep)} no_identificados={no_identificados.sum()} "
          f"sin_cuadro={sin_cuadro.sum()} otros={len(sin_sep) - no_identificados.sum() - sin_cuadro.sum()}")
    assert tabla["separacion_yd"].notna().sum() == 7240
    assert len(sin_sep) == 325
    assert no_identificados.sum() == 322
    assert sin_cuadro.sum() == 3


def test_tiempo_bolsillo_no_negativo(tabla):
    """El tiempo de bolsillo de las jugadas con_pase nunca es negativo ni nulo."""
    con_pase = tabla[tabla["categoria_bolsillo"].astype(str) == "con_pase"]
    negativos = con_pase[con_pase["tiempo_bolsillo_s"] < 0]
    if len(negativos):
        print(negativos[["game_id", "play_id", "cuadro_snap", "cuadro_pase", "tiempo_bolsillo_s"]].head(20))
    assert con_pase["tiempo_bolsillo_s"].notna().all()
    assert len(negativos) == 0, f"{len(negativos)} jugadas con tiempo_bolsillo_s < 0"


def test_velocidad_maxima_jugadores(motor_real):
    """Velocidad máxima de jugadores (sin balón) en los 122 tracking: 11.18 yd/s."""
    partidos = listar_partidos()
    assert len(partidos) == 122
    maximo = 0.0
    for game_id in partidos:
        # Solo `team` y `s`, un archivo a la vez.
        trk = leer_tracking_partido(game_id, columnas=["team", "s"])
        jugadores = trk.loc[trk["team"].astype(str) != "football", "s"]
        maximo = max(maximo, float(jugadores.max()))
    print(f"\n[velocidad] máximo de jugadores = {maximo:.4f} yd/s")
    assert maximo == pytest.approx(11.18, abs=0.005)
