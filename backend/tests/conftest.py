"""Fixtures compartidos de las pruebas de integración con datos reales.

El motor completo se construye UNA vez por sesión (~13 s). Ningún fixture es
autouse: solo las pruebas que lo piden explícitamente lo usan, así que no
contaminan `app.state` de las demás pruebas.
"""

import time

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.motor.precalculo import EstadoMotor, construir_motor


@pytest.fixture(scope="session")
def motor_real() -> EstadoMotor:
    """Construye el motor con los datos reales una sola vez y muestra la duración."""
    inicio = time.perf_counter()
    motor = construir_motor()
    duracion = time.perf_counter() - inicio
    print(f"\n[motor_real] construir_motor() tardó {duracion:.2f} s "
          f"(estado={motor.estado}, tiempos={ {k: round(v, 2) for k, v in motor.tiempos.items()} })")
    assert motor.estado == "listo", motor.mensaje
    return motor


@pytest.fixture
def cliente_listo(motor_real: EstadoMotor):
    """Cliente de prueba con `app.state.motor` = motor de sesión, sin ejecutar el lifespan.

    Se crea el `TestClient` sin `with`, así el lifespan no corre. Al terminar
    restaura el valor previo de `app.state.motor`.
    """
    previo = getattr(app.state, "motor", None)
    app.state.motor = motor_real
    try:
        yield TestClient(app)
    finally:
        app.state.motor = previo
