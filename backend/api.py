"""Rutas de la API bajo `/api`. Los cálculos viven en `backend/motor/`."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError

from .esquemas import (
    AnalisisRespuesta,
    FiltrosRespuesta,
    JugadaListada,
    JugadaRespuesta,
    nan_a_none,
    redondear_floats,
)
from .motor import config
from .motor.agregados import analizar
from .motor.filtros import filtrar_jugadas
from .motor.jugada import detalle_jugada
from .motor.precalculo import ERROR, LISTO, EstadoMotor

router = APIRouter(prefix="/api")


def obtener_estado(request: Request) -> EstadoMotor:
    """Devuelve el estado del motor; responde 503 si está en error o no existe."""
    estado = getattr(request.app.state, "motor", None)
    if estado is None:
        raise HTTPException(status_code=503, detail="Motor de datos no disponible")
    if estado.estado == ERROR:
        raise HTTPException(status_code=503, detail=estado.mensaje)
    return estado


@router.get("/filtros", response_model=FiltrosRespuesta)
def filtros(estado: EstadoMotor = Depends(obtener_estado)) -> dict:
    """Catálogo de valores de filtro; responde en cuanto hay tablas base."""
    if estado.catalogo is None:
        raise HTTPException(status_code=503, detail="Cargando tablas base")
    return nan_a_none(estado.catalogo)


def obtener_motor_listo(estado: EstadoMotor = Depends(obtener_estado)) -> EstadoMotor:
    """Exige motor `listo`; en `cargando` responde 503 con `Retry-After: 5`.

    El estado `error` ya lo rechaza `obtener_estado` con el mensaje del archivo.
    """
    if estado.estado != LISTO:
        raise HTTPException(
            status_code=503,
            detail="Precalculando datos",
            headers={"Retry-After": "5"},
        )
    return estado


def _error_catalogo(campo: str, valor: object, permitidos: list) -> RequestValidationError:
    """Crea un 422 con la forma estándar de FastAPI para un valor fuera del catálogo."""
    return RequestValidationError(
        [
            {
                "type": "value_error",
                "loc": ("query", campo),
                "msg": f"Valor fuera del catálogo; opciones: {permitidos}",
                "input": valor,
            }
        ]
    )


def validar_catalogo(
    catalogo: dict, ofensiva: str | None, defensiva: str | None, semana: int | None
) -> None:
    """Lanza 422 si `ofensiva`, `defensiva` o `semana` no están en el catálogo."""
    for campo, valor in (("ofensiva", ofensiva), ("defensiva", defensiva)):
        if valor is not None and valor not in catalogo["equipos"]:
            raise _error_catalogo(campo, valor, catalogo["equipos"])
    if semana is not None and semana not in catalogo["semanas"]:
        raise _error_catalogo("semana", semana, catalogo["semanas"])


def parametros_filtro(
    ofensiva: str | None = None,
    defensiva: str | None = None,
    semana: int | None = None,
    down: int | None = Query(default=None, ge=1, le=4),
    distancia: Literal["corta", "media", "larga"] | None = None,
) -> dict:
    """Parámetros de filtro compartidos por `/analisis` y `/jugadas`."""
    return {
        "ofensiva": ofensiva,
        "defensiva": defensiva,
        "semana": semana,
        "down": down,
        "distancia": distancia,
    }


def _validar_filtros(estado: EstadoMotor, filtros_: dict) -> None:
    """Aplica la validación 422 de catálogo a un dict de filtros."""
    validar_catalogo(
        estado.catalogo, filtros_["ofensiva"], filtros_["defensiva"], filtros_["semana"]
    )


@router.get("/analisis", response_model=AnalisisRespuesta)
def analisis(
    filtros_: dict = Depends(parametros_filtro),
    estado: EstadoMotor = Depends(obtener_motor_listo),
) -> dict:
    """Análisis agregado con filtros opcionales (contrato-api.md).

    Si el motor no está listo responde 503 antes de validar el catálogo. Los
    floats se redondean a 4 decimales aquí, en la capa de respuesta.
    """
    _validar_filtros(estado, filtros_)
    resultado = analizar(estado.tabla_jugadas, filtros_)
    return redondear_floats(nan_a_none(resultado))


@router.get("/jugadas", response_model=list[JugadaListada])
def jugadas(
    filtros_: dict = Depends(parametros_filtro),
    estado: EstadoMotor = Depends(obtener_estado),
) -> list[dict]:
    """Lista de jugadas filtradas, ordenada por `game_id` y `play_id`.

    Usa la tabla base: responde también mientras el tracking se precalcula.
    """
    if estado.tabla_base is None:
        raise HTTPException(status_code=503, detail="Cargando tablas base")
    _validar_filtros(estado, filtros_)
    filtrada = filtrar_jugadas(estado.tabla_base, **filtros_)
    columnas = ["game_id", "play_id", "descripcion", "down", "yardas_por_avanzar", "resultado_pase"]
    lista = filtrada.sort_values(["game_id", "play_id"])[columnas]
    return nan_a_none(lista.to_dict(orient="records"))


@router.get("/jugada/{game_id}/{play_id}", response_model=JugadaRespuesta)
def jugada(
    game_id: int,
    play_id: int,
    request: Request,
    estado: EstadoMotor = Depends(obtener_estado),
) -> dict:
    """Detalle de una jugada con su tracking cuadro a cuadro (contrato-api.md).

    Responde en cuanto hay tablas base, aunque el precálculo siga en curso.
    404 si la jugada no existe; 422 si los ids no son enteros (lo valida FastAPI).
    """
    dir_datos = getattr(request.app.state, "dir_datos", None) or config.DIR_DATOS
    detalle = detalle_jugada(estado, game_id, play_id, dir_datos)
    if detalle is None:
        raise HTTPException(status_code=404, detail="Jugada no encontrada")
    return redondear_floats(nan_a_none(detalle))
