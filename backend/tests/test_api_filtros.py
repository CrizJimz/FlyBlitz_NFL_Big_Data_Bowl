"""Pruebas de ejemplo de `/health` y `/api/filtros` (tarea 3.4)."""

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.motor import config

LLAVES = {
    "equipos", "semanas", "downs", "rangos_distancia",
    "tipos_cobertura", "coberturas", "formaciones",
}
# Rutas propias de FastAPI/health que no cuelgan de /api.
RUTAS_FUERA_DE_API = {"/health", "/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}


@pytest.fixture(autouse=True)
def estado_limpio():
    """Restablece el estado compartido de `app.state` antes y después de cada prueba."""
    def limpiar():
        app.state.motor = None
        app.state.dir_datos = None

    limpiar()
    yield
    limpiar()


def _unicos(*series: pd.Series) -> list[str]:
    """Únicos no nulos como texto, ordenados (cálculo independiente del motor)."""
    unidos = pd.concat(series, ignore_index=True).dropna().unique()
    return sorted(str(v) for v in unidos)


def test_health_ok_con_estado_error(tmp_path):
    """`/health` responde ok aunque el motor quede en error por ruta inexistente."""
    app.state.dir_datos = tmp_path / "no_existe"
    with TestClient(app) as cliente:
        assert app.state.motor.estado == "error"
        respuesta = cliente.get("/health")
        assert respuesta.status_code == 200
        assert respuesta.json() == {"status": "ok"}
        # Con el motor en error, los datos responden 503.
        assert cliente.get("/api/filtros").status_code == 503


def test_filtros_llaves_y_valores_iguales_a_csv():
    """`/api/filtros` trae las siete llaves y valores iguales a `unique()` de los CSV."""
    plays = pd.read_csv(
        config.DIR_DATOS / "plays.csv",
        usecols=["possessionTeam", "defensiveTeam", "down",
                 "pff_passCoverageType", "pff_passCoverage", "offenseFormation"],
    )
    games = pd.read_csv(config.DIR_DATOS / "games.csv", usecols=["week"])

    with TestClient(app) as cliente:
        respuesta = cliente.get("/api/filtros")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()

    assert set(cuerpo) == LLAVES
    assert cuerpo["equipos"] == _unicos(plays["possessionTeam"], plays["defensiveTeam"])
    assert cuerpo["semanas"] == sorted(int(s) for s in games["week"].dropna().unique())
    # El down 0 (conversiones de 2 puntos) no se ofrece como filtro.
    assert cuerpo["downs"] == sorted(int(d) for d in plays["down"].dropna().unique() if d in (1, 2, 3, 4))
    assert cuerpo["tipos_cobertura"] == _unicos(plays["pff_passCoverageType"])
    assert cuerpo["coberturas"] == _unicos(plays["pff_passCoverage"])
    assert cuerpo["formaciones"] == _unicos(plays["offenseFormation"])
    assert [r["clave"] for r in cuerpo["rangos_distancia"]] == list(config.RANGOS_DISTANCIA)


def test_rutas_de_datos_bajo_api():
    """Toda ruta fuera de health y documentación empieza con `/api/`."""
    rutas = [r.path for r in app.routes if hasattr(r, "path")]
    de_datos = [p for p in rutas if p not in RUTAS_FUERA_DE_API]
    assert "/api/filtros" in de_datos
    assert all(p.startswith("/api/") for p in de_datos), de_datos
