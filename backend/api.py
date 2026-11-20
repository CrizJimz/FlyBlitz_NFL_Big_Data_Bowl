"""Rutas de la API bajo `/api`. Los cálculos viven en `backend/motor/`."""

from fastapi import APIRouter, Depends, HTTPException, Request

from .esquemas import FiltrosRespuesta, nan_a_none
from .motor.precalculo import ERROR, EstadoMotor

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
