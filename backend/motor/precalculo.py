"""Estado del motor de datos y carga de las tablas base.

Por ahora solo implementa la carga síncrona de las tablas base. Las tareas
siguientes agregarán el precálculo de tracking (estados "cargando" y "listo").
"""

import logging
import time
from dataclasses import dataclass, field
from pathlib import Path

from .carga import ArchivoFaltante, TablasBase, leer_tablas_base
from .config import DIR_DATOS
from .filtros import construir_catalogo

registro = logging.getLogger(__name__)

# Estados posibles del motor. "base_lista": tablas base y catálogo disponibles.
CARGANDO = "cargando"
BASE_LISTA = "base_lista"
LISTO = "listo"
ERROR = "error"


@dataclass
class EstadoMotor:
    """Estado compartido del motor; vive en `app.state.motor`."""

    estado: str = CARGANDO
    mensaje: str = ""
    tablas: TablasBase | None = None
    catalogo: dict | None = None
    tiempos: dict = field(default_factory=dict)

    @property
    def base_disponible(self) -> bool:
        """Indica si las tablas base y el catálogo ya se pueden consultar."""
        return self.estado in (BASE_LISTA, LISTO) and self.catalogo is not None


def cargar_motor_base(dir_datos: Path = DIR_DATOS) -> EstadoMotor:
    """Carga de forma síncrona las tablas base y el catálogo de filtros.

    Si falta un archivo registra su nombre con `logging.error` y devuelve un
    estado `error` con el detalle que verá el cliente (503).
    """
    inicio = time.perf_counter()
    try:
        tablas = leer_tablas_base(dir_datos)
        catalogo = construir_catalogo(tablas)
    except ArchivoFaltante as exc:
        registro.error("Falta el archivo de datos: %s", exc.nombre)
        return EstadoMotor(
            estado=ERROR,
            mensaje=f"Motor de datos no disponible: falta {exc.nombre}",
        )
    duracion = time.perf_counter() - inicio
    registro.info("Tablas base cargadas en %.2f s", duracion)
    return EstadoMotor(
        estado=BASE_LISTA,
        mensaje="Tablas base cargadas",
        tablas=tablas,
        catalogo=catalogo,
        tiempos={"carga_base_s": duracion},
    )
