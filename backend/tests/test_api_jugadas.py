"""Pruebas de `GET /api/jugadas` con datos reales (TestClient)."""

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.motor import config
from backend.motor.precalculo import cargar_motor_base

LLAVES = {"game_id", "play_id", "descripcion", "down", "yardas_por_avanzar", "resultado_pase"}


@pytest.fixture(scope="module")
def plays() -> pd.DataFrame:
    """`plays.csv` leído directo con pandas, para comparar contra la API."""
    return pd.read_csv(config.DIR_DATOS / "plays.csv")


def test_sin_filtros_devuelve_todas_ordenadas(cliente_listo, plays):
    """Sin filtros: 8,557 jugadas, 6 llaves exactas y orden por (game_id, play_id)."""
    resp = cliente_listo.get("/api/jugadas")
    assert resp.status_code == 200
    datos = resp.json()
    assert len(datos) == 8557 == len(plays)
    assert all(set(d) == LLAVES for d in datos)
    pares = [(d["game_id"], d["play_id"]) for d in datos]
    assert pares == sorted(pares)
    print(f"\n[jugadas] JSON sin filtros: {len(resp.content) / 1024:.0f} KB")


def test_filtro_coincide_con_pandas(cliente_listo, plays):
    """ofensiva=KC y down=3 coincide en número e ids con pandas directo."""
    datos = cliente_listo.get("/api/jugadas", params={"ofensiva": "KC", "down": 3}).json()
    esperado = plays[(plays["possessionTeam"] == "KC") & (plays["down"] == 3)]
    assert len(datos) == len(esperado) > 0
    assert {(d["game_id"], d["play_id"]) for d in datos} == set(
        zip(esperado["gameId"], esperado["playId"])
    )
    assert all(d["down"] == 3 for d in datos)


def test_sin_coincidencias_devuelve_lista_vacia(cliente_listo):
    """Una combinación sin jugadas responde 200 con []."""
    resp = cliente_listo.get("/api/jugadas", params={"ofensiva": "KC", "defensiva": "KC"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.parametrize("params", [{"down": 0}, {"ofensiva": "XXX"}, {"semana": 99}])
def test_valores_invalidos_responden_422(cliente_listo, params):
    """down fuera de 1-4 o valores fuera de catálogo dan 422."""
    assert cliente_listo.get("/api/jugadas", params=params).status_code == 422


def test_responde_en_estado_cargando():
    """Con el motor en `cargando` (solo tablas base) responde 200, no 503."""
    base = cargar_motor_base()
    assert base.estado == "cargando"
    previo = getattr(app.state, "motor", None)
    app.state.motor = base
    try:
        resp = TestClient(app).get("/api/jugadas", params={"down": 3})
    finally:
        app.state.motor = previo
    assert resp.status_code == 200
    assert len(resp.json()) > 0
