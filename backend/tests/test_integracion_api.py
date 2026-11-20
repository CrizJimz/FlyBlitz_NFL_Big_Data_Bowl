"""Integración de `GET /api/analisis` con cifras de referencia (tarea 9.4).

Usa el motor real (fixture `motor_real`) y compara contra cifras conocidas del
dataset y contra un cálculo pandas independiente sobre `plays.csv`.
"""

import pandas as pd
import pytest

from backend.motor import config

# Llaves exactas copiadas de contrato-api.md (no derivadas del código).
LLAVES_RAIZ = {
    "filtros_aplicados", "n_jugadas", "n_excluidas_down_0",
    "success_rate", "coberturas", "bolsillo", "separacion",
}
LLAVES_FILTROS = {"ofensiva", "defensiva", "semana", "down", "distancia"}
LLAVES_SR = {"global", "por_down_distancia"}
LLAVES_TASA = {"n", "exitosas", "tasa"}
LLAVES_DOWN_DIST = {"down", "distancia", "n", "exitosas", "tasa"}
LLAVES_COBERTURA = {
    "tipo_cobertura", "down", "distancia", "n", "success_rate",
    "yardas_promedio", "resultado_pase",
}
LLAVES_RESULTADO_PASE = {"C", "I", "S", "R", "IN"}
LLAVES_BOLSILLO = {
    "n_con_pase", "n_sin_pase", "n_sin_snap",
    "n_con_respaldo_autoevent", "por_grupo",
}
LLAVES_GRUPO = {
    "play_action", "presion", "n", "tiempo_promedio_s",
    "tiempo_mediana_s", "success_rate",
}
LLAVES_SEPARACION = {"n", "n_sin_receptor_identificado", "momento", "por_resultado"}
LLAVES_POR_RESULTADO = {
    "resultado_pase", "n", "separacion_promedio_yd", "separacion_mediana_yd",
    "vel_receptor_promedio", "vel_defensor_promedio",
}


@pytest.fixture(scope="module")
def completo(motor_real):
    """Respuesta sin filtros, calculada una vez por módulo vía el cliente."""
    from fastapi.testclient import TestClient

    from backend.main import app

    previo = getattr(app.state, "motor", None)
    app.state.motor = motor_real
    try:
        resp = TestClient(app).get("/api/analisis")
    finally:
        app.state.motor = previo
    assert resp.status_code == 200
    return resp.json()


def test_cifras_de_referencia_sin_filtros(completo):
    """Cifras globales conocidas del dataset."""
    assert completo["n_jugadas"] == 8557
    assert completo["n_excluidas_down_0"] == 35
    b = completo["bolsillo"]
    assert (b["n_con_pase"], b["n_sin_pase"], b["n_sin_snap"]) == (7541, 992, 24)
    assert b["n_con_pase"] + b["n_sin_pase"] + b["n_sin_snap"] == completo["n_jugadas"]
    assert completo["separacion"]["n"] == 7240
    assert completo["separacion"]["n_sin_receptor_identificado"] == 325


def test_llaves_exactas_del_contrato(completo):
    """Todos los niveles traen exactamente las llaves del contrato."""
    assert set(completo) == LLAVES_RAIZ
    assert set(completo["filtros_aplicados"]) == LLAVES_FILTROS
    assert all(v is None for v in completo["filtros_aplicados"].values())
    sr = completo["success_rate"]
    assert set(sr) == LLAVES_SR
    assert set(sr["global"]) == LLAVES_TASA
    assert sr["por_down_distancia"]
    for fila in sr["por_down_distancia"]:
        assert set(fila) == LLAVES_DOWN_DIST
    assert completo["coberturas"]
    for fila in completo["coberturas"]:
        assert set(fila) == LLAVES_COBERTURA
        assert set(fila["resultado_pase"]) == LLAVES_RESULTADO_PASE
    assert set(completo["bolsillo"]) == LLAVES_BOLSILLO
    assert completo["bolsillo"]["por_grupo"]
    for fila in completo["bolsillo"]["por_grupo"]:
        assert set(fila) == LLAVES_GRUPO
    assert set(completo["separacion"]) == LLAVES_SEPARACION
    assert completo["separacion"]["momento"] == "pass_forward"
    assert completo["separacion"]["por_resultado"]
    for fila in completo["separacion"]["por_resultado"]:
        assert set(fila) == LLAVES_POR_RESULTADO


def _tasas(r: dict) -> list[float]:
    """Recolecta todas las tasas (success_rate / tasa) de la respuesta."""
    tasas = [r["success_rate"]["global"]["tasa"]]
    tasas += [f["tasa"] for f in r["success_rate"]["por_down_distancia"]]
    tasas += [f["success_rate"] for f in r["coberturas"]]
    tasas += [f["success_rate"] for f in r["bolsillo"]["por_grupo"]]
    return tasas


def test_tasas_entre_0_y_1(completo):
    """Toda tasa viaja en [0, 1]."""
    assert all(0.0 <= t <= 1.0 for t in _tasas(completo))


def test_ninguna_combinacion_con_n_cero(completo):
    """Las combinaciones sin jugadas se omiten: nunca llegan con n = 0."""
    assert all(f["n"] > 0 for f in completo["success_rate"]["por_down_distancia"])
    assert all(f["n"] > 0 for f in completo["coberturas"])
    assert all(f["n"] > 0 for f in completo["bolsillo"]["por_grupo"])
    assert all(f["n"] > 0 for f in completo["separacion"]["por_resultado"])


def test_down1_corta_coincide_con_pandas_independiente(cliente_listo):
    """Con down=1 y distancia=corta, las cifras igualan un cálculo directo sobre plays.csv."""
    plays = pd.read_csv(
        config.DIR_DATOS / "plays.csv",
        usecols=["down", "yardsToGo", "passResult", "prePenaltyPlayResult"],
    )
    sel = plays[(plays["down"] == 1) & plays["yardsToGo"].between(1, 3)]
    n = len(sel)
    exitosas = int(
        ((sel["passResult"] != "IN")
         & (5 * sel["prePenaltyPlayResult"] >= 2 * sel["yardsToGo"])).sum()
    )
    assert n > 0
    tasa = exitosas / n

    resp = cliente_listo.get("/api/analisis", params={"down": 1, "distancia": "corta"})
    assert resp.status_code == 200
    r = resp.json()
    assert r["filtros_aplicados"] == {
        "ofensiva": None, "defensiva": None, "semana": None,
        "down": 1, "distancia": "corta",
    }
    assert r["n_jugadas"] == n
    g = r["success_rate"]["global"]
    assert (g["n"], g["exitosas"]) == (n, exitosas)
    assert g["tasa"] == pytest.approx(tasa, abs=1e-4)

    celdas = r["success_rate"]["por_down_distancia"]
    assert len(celdas) == 1
    c = celdas[0]
    assert (c["down"], c["distancia"], c["n"], c["exitosas"]) == (1, "corta", n, exitosas)
    assert c["tasa"] == pytest.approx(tasa, abs=1e-4)


@pytest.mark.parametrize(
    "params",
    [
        {"down": 0},
        {"down": "abc"},
        {"semana": 99},
        {"distancia": "xyz"},
        {"ofensiva": "XXX"},
    ],
)
def test_parametros_invalidos_422(cliente_listo, params):
    """Valores fuera de rango o del catálogo responden 422."""
    assert cliente_listo.get("/api/analisis", params=params).status_code == 422


def test_filtro_valido_sin_coincidencias(cliente_listo, motor_real):
    """Un equipo no puede ser ofensiva y defensiva a la vez: 200 con ceros y listas vacías."""
    equipo = motor_real.catalogo["equipos"][0]
    resp = cliente_listo.get("/api/analisis", params={"ofensiva": equipo, "defensiva": equipo})
    assert resp.status_code == 200
    r = resp.json()
    assert r["n_jugadas"] == 0
    assert r["n_excluidas_down_0"] == 0
    assert r["success_rate"]["global"] == {"n": 0, "exitosas": 0, "tasa": 0.0}
    assert r["success_rate"]["por_down_distancia"] == []
    assert r["coberturas"] == []
    b = r["bolsillo"]
    assert (b["n_con_pase"], b["n_sin_pase"], b["n_sin_snap"]) == (0, 0, 0)
    assert b["por_grupo"] == []
    assert r["separacion"]["n"] == 0
    assert r["separacion"]["n_sin_receptor_identificado"] == 0
    assert r["separacion"]["por_resultado"] == []
