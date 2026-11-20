"""Modelos Pydantic de la API con las llaves exactas de contrato-api.md.

Contiene los modelos de ``GET /api/filtros`` y ``GET /api/analisis``.
"""

import math
from typing import Any

import numpy as np
from pydantic import BaseModel, ConfigDict, Field


def nan_a_none(valor: Any) -> Any:
    """Convierte recursivamente ``NaN`` a ``None`` y tipos numpy a tipos Python.

    Recorre dicts, listas y tuplas. Los ``float`` (Python o numpy) con valor
    ``NaN`` pasan a ``None``; ``np.integer``, ``np.floating`` y ``np.bool_``
    pasan a ``int``, ``float`` y ``bool``; los ``ndarray`` pasan a lista.
    """
    if isinstance(valor, dict):
        return {k: nan_a_none(v) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [nan_a_none(v) for v in valor]
    if isinstance(valor, np.ndarray):
        return [nan_a_none(v) for v in valor.tolist()]
    if isinstance(valor, np.bool_):
        return bool(valor)
    if isinstance(valor, np.integer):
        return int(valor)
    if isinstance(valor, (float, np.floating)):
        numero = float(valor)
        return None if math.isnan(numero) else numero
    return valor


def redondear_floats(valor: Any, decimales: int = 4) -> Any:
    """Redondea recursivamente todos los ``float`` a ``decimales`` decimales.

    Se aplica en la capa de respuesta (no en el motor): las columnas de tracking
    son float32 y generan ruido como 2.544475555419922. Los ``bool`` y los
    ``int`` no se tocan; ``None`` se conserva.
    """
    if isinstance(valor, dict):
        return {k: redondear_floats(v, decimales) for k, v in valor.items()}
    if isinstance(valor, (list, tuple)):
        return [redondear_floats(v, decimales) for v in valor]
    if isinstance(valor, float):
        return round(valor, decimales)
    return valor


class RangoDistancia(BaseModel):
    """Rango de yardas por ganar; ``max`` es ``None`` en el rango abierto."""

    clave: str
    min: int
    max: int | None = None


class FiltrosRespuesta(BaseModel):
    """Catálogo de valores disponibles para filtrar (``GET /api/filtros``)."""

    equipos: list[str]
    semanas: list[int]
    downs: list[int]
    rangos_distancia: list[RangoDistancia]
    tipos_cobertura: list[str]
    coberturas: list[str]
    formaciones: list[str]


class FiltrosAplicados(BaseModel):
    """Filtros recibidos en la petición; ``None`` si no se envió."""

    ofensiva: str | None = None
    defensiva: str | None = None
    semana: int | None = None
    down: int | None = None
    distancia: str | None = None


class Tasa(BaseModel):
    """Tasa de éxito con su tamaño de muestra (``tasa`` entre 0 y 1)."""

    n: int
    exitosas: int
    tasa: float


class TasaDownDistancia(Tasa):
    """Tasa de éxito para una combinación de down y rango de distancia."""

    down: int
    distancia: str


class GlobalYPorDownDistancia(BaseModel):
    """Bloque ``success_rate``: tasa global y desglose por down y distancia."""

    # `global` es palabra reservada de Python: se usa alias.
    global_: Tasa = Field(serialization_alias="global", validation_alias="global")
    por_down_distancia: list[TasaDownDistancia]

    model_config = ConfigDict(populate_by_name=True)


class ResultadoPase(BaseModel):
    """Conteo de jugadas por resultado de pase: C, I, S, R e IN."""

    C: int
    I: int
    S: int
    R: int
    IN: int


class GrupoCobertura(BaseModel):
    """Métricas de un tipo de cobertura en un down y rango de distancia."""

    tipo_cobertura: str
    down: int
    distancia: str
    n: int
    success_rate: float
    yardas_promedio: float
    resultado_pase: ResultadoPase


class GrupoBolsillo(BaseModel):
    """Métricas de bolsillo para una combinación de play action y presión."""

    play_action: bool
    presion: bool
    n: int
    tiempo_promedio_s: float
    tiempo_mediana_s: float
    success_rate: float


class Bolsillo(BaseModel):
    """Bloque ``bolsillo``: contadores por categoría y grupos con pase."""

    n_con_pase: int
    n_sin_pase: int
    n_sin_snap: int
    n_con_respaldo_autoevent: int
    por_grupo: list[GrupoBolsillo]


class GrupoSeparacion(BaseModel):
    """Separación receptor-defensor y velocidades por resultado de pase."""

    resultado_pase: str
    n: int
    separacion_promedio_yd: float
    separacion_mediana_yd: float
    vel_receptor_promedio: float
    vel_defensor_promedio: float


class Separacion(BaseModel):
    """Bloque ``separacion`` medido en el cuadro ``pass_forward``."""

    n: int
    n_sin_receptor_identificado: int
    momento: str
    por_resultado: list[GrupoSeparacion]


class AnalisisRespuesta(BaseModel):
    """Respuesta de ``GET /api/analisis`` con las llaves de contrato-api.md."""

    filtros_aplicados: FiltrosAplicados
    n_jugadas: int
    n_excluidas_down_0: int
    success_rate: GlobalYPorDownDistancia
    coberturas: list[GrupoCobertura]
    bolsillo: Bolsillo
    separacion: Separacion


class JugadaListada(BaseModel):
    """Elemento de ``GET /api/jugadas``; ``resultado_pase`` es nulo si no hubo pase."""

    game_id: int
    play_id: int
    descripcion: str | None
    down: int
    yardas_por_avanzar: int
    resultado_pase: str | None


class Evento(BaseModel):
    """Evento de tracking de una jugada: primer cuadro en que ocurre."""

    frame_id: int
    evento: str


class ReceptorObjetivo(BaseModel):
    """Receptor nombrado en la descripción y su separación en el cuadro del pase."""

    nfl_id: int
    nombre: str | None = None
    separacion_yd: float | None = None


class JugadorFrame(BaseModel):
    """Jugador (o balón) en un cuadro; en el balón los campos de identidad son nulos."""

    nfl_id: int | None = None
    nombre: str | None = None
    dorsal: int | None = None
    equipo: str | None = None
    lado: str | None = None
    rol: str | None = None
    x: float | None = None
    y: float | None = None
    s: float | None = None
    o: float | None = None
    dir: float | None = None


class Frame(BaseModel):
    """Cuadro de tracking con todos los jugadores y el balón."""

    frame_id: int
    jugadores: list[JugadorFrame]


class JugadaRespuesta(BaseModel):
    """Respuesta de ``GET /api/jugada/{game_id}/{play_id}`` (contrato-api.md)."""

    game_id: int
    play_id: int
    descripcion: str | None = None
    semana: int | None = None
    down: int | None = None
    yardas_por_avanzar: int | None = None
    ofensiva: str
    defensiva: str
    resultado_pase: str | None = None
    resultado_yardas: float | None = None
    cobertura: str | None = None
    tipo_cobertura: str | None = None
    play_action: bool
    frames_por_segundo: int
    eventos: list[Evento]
    receptor_objetivo: ReceptorObjetivo | None = None
    frames: list[Frame]
