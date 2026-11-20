"""Pruebas de ejemplo de la carga de datos (`backend/motor/carga.py`)."""

import pytest

from backend.motor.carga import (
    ArchivoFaltante,
    leer_tablas_base,
    leer_tracking_partido,
    listar_partidos,
)
from backend.motor.config import DIR_DATOS


def test_tablas_base_devuelven_8557_jugadas():
    """Las tablas base reales traen 8,557 jugadas en `plays`."""
    tablas = leer_tablas_base(DIR_DATOS)
    assert len(tablas.plays) == 8557


def test_archivo_faltante_nombra_el_archivo(tmp_path):
    """Una ruta sin CSV lanza `ArchivoFaltante` con el nombre del primer archivo ausente."""
    with pytest.raises(ArchivoFaltante) as error:
        leer_tablas_base(tmp_path)
    assert error.value.nombre == "games.csv"
    assert "games.csv" in str(error.value)


def test_tracking_faltante_nombra_el_archivo(tmp_path):
    """Un tracking inexistente lanza `ArchivoFaltante` con su nombre."""
    with pytest.raises(ArchivoFaltante) as error:
        leer_tracking_partido(123, tmp_path)
    assert error.value.nombre == "tracking_123.csv"


def test_tracking_trae_solo_las_columnas_pedidas():
    """El tracking de un partido trae las columnas pedidas más `gameId` (del nombre del archivo)."""
    game_id = listar_partidos(DIR_DATOS)[0]
    df = leer_tracking_partido(game_id, DIR_DATOS, ["playId", "frameId", "x"])
    assert list(df.columns) == ["gameId", "playId", "frameId", "x"]
    assert not df.empty
    assert (df["gameId"] == game_id).all()
