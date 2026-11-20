"""Estado del motor de datos, carga de tablas base y precálculo de tracking."""

import logging
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

from .bolsillo import (
    categoria_bolsillo, elegir_cuadro, presion_pff, primer_cuadro_evento, tiempo_bolsillo,
)
from .carga import (
    ArchivoFaltante, TablasBase, leer_tablas_base, leer_tracking_partido, listar_partidos,
)
from .config import DIR_DATOS, PASE, PASE_CON_BALON, SNAP
from .exito import es_exitosa, rango_distancia
from .filtros import construir_catalogo
from .normalizacion import normalizar_tracking
from .receptor import resolver_receptores
from .separacion import separaciones_partido

registro = logging.getLogger(__name__)

# Estados del motor. Se eliminó "base_lista": en "cargando" las tablas base y el
# catálogo ya pueden estar disponibles (ver `base_disponible`).
CARGANDO = "cargando"
LISTO = "listo"
ERROR = "error"


@dataclass
class EstadoMotor:
    """Estado compartido del motor; vive en `app.state.motor`."""

    estado: str = CARGANDO
    mensaje: str = ""
    tablas: TablasBase | None = None
    tabla_jugadas: pd.DataFrame | None = None
    # Tabla por jugada sin tracking; existe desde "cargando" (la usa /api/jugadas).
    tabla_base: pd.DataFrame | None = None
    catalogo: dict | None = None
    tiempos: dict = field(default_factory=dict)

    @property
    def base_disponible(self) -> bool:
        """Indica si las tablas base y el catálogo ya se pueden consultar."""
        return self.estado in (CARGANDO, LISTO) and self.catalogo is not None


def _como_texto(serie: pd.Series) -> pd.Series:
    """Convierte una columna categórica a texto (`object`) conservando los nulos."""
    return serie.astype("object")


def _presion_por_jugada(pff: pd.DataFrame, tabla: pd.DataFrame) -> pd.Series:
    """Alinea la presión PFF con las filas de `tabla` por (gameId, playId).

    Las jugadas sin fila de presión se marcan False (PFF cubre todas las jugadas).
    Devuelve una serie booleana con el mismo índice que `tabla`.
    """
    presion = presion_pff(pff)
    clave = pd.MultiIndex.from_arrays([tabla["game_id"], tabla["play_id"]])
    valores = presion.reindex(clave).fillna(False).astype(bool).to_numpy()
    return pd.Series(valores, index=tabla.index, dtype=bool)


def construir_tabla_base(tablas: TablasBase) -> pd.DataFrame:
    """Construye la tabla por jugada con las columnas que no requieren tracking.

    Una fila por (`gameId`, `playId`). La semana se une con `games` por
    `gameId` (nunca por nombre). No se eliminan filas con nulos: los nulos de
    `formacion`, `cobertura`, `tipo_cobertura`, `resultado_pase` y
    `rango_distancia` se conservan. `presion` viene de `pffScoutingData`. No modifica las tablas de entrada ni
    escribe en disco.
    """
    plays = tablas.plays
    # Unión por gameId; `validate` falla si `games` tuviera ids repetidos.
    semanas = tablas.games[["gameId", "week"]].rename(columns={"week": "semana"})
    base = plays.merge(semanas, on="gameId", how="left", validate="many_to_one")

    # Enteros de 64 bits para que las operaciones de éxito no desborden.
    down = base["down"].astype("int64")
    ytg = base["yardsToGo"].astype("int64")
    pre = base["prePenaltyPlayResult"].astype("int64")
    resultado = _como_texto(base["passResult"])

    tabla = pd.DataFrame({
        "game_id": base["gameId"].astype("int64"),
        "play_id": base["playId"].astype("int64"),
        "descripcion": base["playDescription"],
        "semana": base["semana"],
        "ofensiva": _como_texto(base["possessionTeam"]),
        "defensiva": _como_texto(base["defensiveTeam"]),
        "down": down,
        "yardas_por_avanzar": ytg,
        "formacion": _como_texto(base["offenseFormation"]),
        "cobertura": _como_texto(base["pff_passCoverage"]),
        "tipo_cobertura": _como_texto(base["pff_passCoverageType"]),
        "play_action": base["pff_playAction"] == 1,
        "resultado_pase": resultado,
        "yardas_sin_castigo": pre,
        "rango_distancia": rango_distancia(ytg),
        "down_valido": down.between(1, 4),
    })
    tabla["exitosa"] = es_exitosa(down, ytg, pre, resultado) & tabla["down_valido"]
    tabla["presion"] = _presion_por_jugada(tablas.pff, tabla)
    return tabla.reset_index(drop=True)


def _cuadros_de_partido(trk: pd.DataFrame, ids_jugada: pd.Index) -> pd.DataFrame:
    """Cuadros de snap y pase por jugada (índice `playId`) a partir de los eventos.

    Usa el primer cuadro del evento manual y, solo si falta, el automático.
    Devuelve `cuadro_snap`, `cuadro_pase`, `snap_respaldo` y `pase_respaldo`.
    """
    eventos = trk.loc[trk["event"].isin(SNAP + PASE), ["playId", "frameId", "event"]]
    resultado = {}
    for nombre, (manual, auto) in (("snap", SNAP), ("pase", PASE)):
        primario = primer_cuadro_evento(eventos, manual).reindex(ids_jugada)
        respaldo = primer_cuadro_evento(eventos, auto).reindex(ids_jugada)
        cuadro, usa = elegir_cuadro(primario, respaldo)
        resultado[f"cuadro_{nombre}"] = cuadro
        resultado[f"{nombre}_respaldo"] = usa
    return pd.DataFrame(resultado, index=ids_jugada)


def _separacion_de_partido(
    trk: pd.DataFrame, jugadas: pd.DataFrame, cobertura: pd.DataFrame, game_id: int
) -> pd.DataFrame:
    """Separación y velocidades en el cuadro de pase, indexada por `playId`.

    `jugadas` trae `playId`, `cuadro_pase` y `receptor_nfl_id`. Solo se conservan
    las filas del tracking que están en el cuadro de pase de cada jugada, y solo
    esas se normalizan. Registra las jugadas sin `playDirection`.
    """
    pedidas = jugadas.dropna(subset=["cuadro_pase", "receptor_nfl_id"])
    llave = pd.DataFrame({
        "playId": pedidas["playId"].astype("int32").to_numpy(),
        "frameId": pedidas["cuadro_pase"].astype("int16").to_numpy(),
    })
    en_cuadro = trk.merge(llave, on=["playId", "frameId"])
    en_cuadro, sin_direccion = normalizar_tracking(en_cuadro)
    for play_id in sin_direccion["playId"]:
        registro.warning("Jugada sin playDirection: gameId=%s playId=%s", game_id, play_id)
    return separaciones_partido(en_cuadro, jugadas, cobertura)


def procesar_partido(
    game_id: int, tabla_base_partido: pd.DataFrame, tablas: TablasBase, dir_datos: Path = DIR_DATOS
) -> pd.DataFrame:
    """Calcula las columnas de tracking de todas las jugadas de un partido.

    Lee solo el tracking de `game_id` (lanza `ArchivoFaltante` si no existe),
    calcula cuadros, categoría y tiempo de bolsillo, y separación/velocidades;
    luego libera el DataFrame. `tabla_base_partido` debe traer `play_id`,
    `resultado_pase` y `receptor_nfl_id`. Devuelve una fila por jugada con
    `game_id`, `play_id` y las columnas de tracking.
    """
    trk = leer_tracking_partido(game_id, dir_datos)
    ids = pd.Index(tabla_base_partido["play_id"].astype("int32").to_numpy(), name="playId")
    cuadros = _cuadros_de_partido(trk, ids)
    resultado = pd.Series(tabla_base_partido["resultado_pase"].to_numpy(), index=ids)
    categoria = categoria_bolsillo(resultado, cuadros["cuadro_snap"], cuadros["cuadro_pase"])
    lanzo = resultado.isin(PASE_CON_BALON)

    jugadas = pd.DataFrame({
        "playId": ids.to_numpy(),
        "cuadro_pase": cuadros["cuadro_pase"].to_numpy(),
        "receptor_nfl_id": tabla_base_partido["receptor_nfl_id"].to_numpy(),
    })
    pff = tablas.pff
    cobertura = pff.loc[(pff["gameId"] == game_id) & (pff["pff_role"].astype(str) == "Coverage"),
                        ["playId", "nflId"]]
    sep = _separacion_de_partido(trk, jugadas, cobertura, game_id).reindex(ids)
    del trk  # se libera el tracking del partido

    salida = pd.DataFrame({
        "game_id": np.int64(game_id),
        "play_id": ids.to_numpy().astype("int64"),
        "cuadro_snap": cuadros["cuadro_snap"].to_numpy(),
        "cuadro_pase": cuadros["cuadro_pase"].to_numpy(),
        "usa_respaldo": (cuadros["snap_respaldo"] | (cuadros["pase_respaldo"] & lanzo)).to_numpy(),
        "categoria_bolsillo": categoria.to_numpy(),
        "tiempo_bolsillo_s": tiempo_bolsillo(cuadros["cuadro_snap"], cuadros["cuadro_pase"], categoria).to_numpy(),
        "separacion_yd": sep["separacion_yd"].to_numpy(),
        "vel_receptor": sep["vel_receptor"].to_numpy(),
        "vel_defensor": sep["vel_defensor"].to_numpy(),
    })
    return salida


def _reducir_tipos(tabla: pd.DataFrame) -> pd.DataFrame:
    """Reduce los tipos de las columnas de tracking para ahorrar memoria."""
    for col in ("cuadro_snap", "cuadro_pase", "tiempo_bolsillo_s", "separacion_yd",
                "vel_receptor", "vel_defensor"):
        tabla[col] = tabla[col].astype("float32")
    tabla["categoria_bolsillo"] = tabla["categoria_bolsillo"].astype("category")
    return tabla


def construir_tabla_jugadas(
    tablas: TablasBase, dir_datos: Path = DIR_DATOS, progreso=None
) -> pd.DataFrame:
    """Construye la tabla por jugada: base + columnas de tracking (una fila por jugada).

    Resuelve los receptores una sola vez (sin tracking) y procesa los partidos
    uno por uno; nunca concatena el tracking. Las jugadas cuyo partido no aporta
    eventos quedan como `sin_snap`. Si falta un tracking lanza `ArchivoFaltante`.
    `progreso(i, total)` es opcional.
    """
    inicio = time.perf_counter()
    base = construir_tabla_base(tablas)
    # La tabla base conserva el orden de `plays`, por eso se alinea por posición.
    receptores = resolver_receptores(tablas.plays, tablas.pff, tablas.players)
    base["receptor_nfl_id"] = receptores.to_numpy()

    partidos = listar_partidos(dir_datos, tablas.games)
    grupos = {g: df for g, df in base.groupby("game_id", sort=False)}
    partes = []
    for i, game_id in enumerate(partidos, start=1):
        if game_id not in grupos:
            continue
        t0 = time.perf_counter()
        partes.append(procesar_partido(game_id, grupos[game_id], tablas, dir_datos))
        registro.info("Partido %s (%d/%d) en %.2f s", game_id, i, len(partidos), time.perf_counter() - t0)
        if progreso:
            progreso(i, len(partidos))

    columnas = ["game_id", "play_id"]
    tracking = pd.concat(partes, ignore_index=True) if partes else pd.DataFrame(columns=columnas)
    tabla = base.merge(tracking, on=columnas, how="left", validate="one_to_one")
    # Partidos sin eventos: sin_snap y sin respaldo.
    tabla["usa_respaldo"] = tabla["usa_respaldo"].fillna(False).astype(bool)
    tabla["categoria_bolsillo"] = tabla["categoria_bolsillo"].fillna("sin_snap")
    tabla = _reducir_tipos(tabla)
    registro.info("Tabla de jugadas: %d filas en %.2f s", len(tabla), time.perf_counter() - inicio)
    return tabla


def cargar_motor_base(dir_datos: Path = DIR_DATOS) -> EstadoMotor:
    """Carga de forma síncrona las tablas base y el catálogo de filtros.

    Devuelve un estado `cargando` con tablas y catálogo (falta el tracking).
    Si falta un archivo registra su nombre con `logging.error` y devuelve un
    estado `error` con el detalle que verá el cliente (503).
    """
    inicio = time.perf_counter()
    try:
        tablas = leer_tablas_base(dir_datos)
        catalogo = construir_catalogo(tablas)
        tabla_base = construir_tabla_base(tablas)
    except ArchivoFaltante as exc:
        registro.error("Falta el archivo de datos: %s", exc.nombre)
        return EstadoMotor(
            estado=ERROR,
            mensaje=f"Motor de datos no disponible: falta {exc.nombre}",
        )
    duracion = time.perf_counter() - inicio
    registro.info("Tablas base cargadas en %.2f s", duracion)
    return EstadoMotor(
        estado=CARGANDO,
        mensaje="Tablas base cargadas; procesando tracking",
        tablas=tablas,
        tabla_base=tabla_base,
        catalogo=catalogo,
        tiempos={"carga_base_s": duracion},
    )


def completar_motor(base: EstadoMotor, dir_datos: Path = DIR_DATOS, progreso=None) -> EstadoMotor:
    """Procesa el tracking sobre un estado base y devuelve un estado NUEVO.

    No modifica `base` (así la publicación del resultado es una sola asignación
    atómica). Si `base` está en error lo devuelve igual. Si falta un archivo o
    algo falla, devuelve un estado `error` con mensaje; nunca escribe a disco.
    """
    if base.estado == ERROR or base.tablas is None:
        return base
    inicio = time.perf_counter()
    try:
        tabla = construir_tabla_jugadas(base.tablas, dir_datos, progreso)
    except ArchivoFaltante as exc:
        registro.error("Falta el archivo de datos: %s", exc.nombre)
        return EstadoMotor(estado=ERROR, mensaje=f"Motor de datos no disponible: falta {exc.nombre}",
                           tiempos=dict(base.tiempos))
    except Exception:  # cualquier fallo deja el motor en error, sin tumbar el servidor
        registro.exception("Falló el precálculo de tracking")
        return EstadoMotor(estado=ERROR, mensaje="Motor de datos no disponible: falló el precálculo",
                           tiempos=dict(base.tiempos))
    duracion = time.perf_counter() - inicio
    tiempos = {**base.tiempos, "precalculo_s": duracion,
               "total_s": base.tiempos.get("carga_base_s", 0.0) + duracion}
    registro.info("Motor listo: precálculo %.2f s, total %.2f s", duracion, tiempos["total_s"])
    return EstadoMotor(estado=LISTO, mensaje="Motor listo", tablas=base.tablas,
                       tabla_jugadas=tabla, tabla_base=base.tabla_base,
                       catalogo=base.catalogo, tiempos=tiempos)


def construir_motor(dir_datos: Path = DIR_DATOS) -> EstadoMotor:
    """Construye todo el motor de forma síncrona; devuelve un estado `listo` o `error`.

    Lo usan las pruebas (sin lifespan) y el hilo de fondo.
    """
    return completar_motor(cargar_motor_base(dir_datos), dir_datos)


def _trabajo_en_hilo(app, base: EstadoMotor, dir_datos: Path) -> None:
    """Cuerpo del hilo: procesa el tracking y publica el estado con una asignación atómica."""
    app.state.motor = completar_motor(base, dir_datos)


def iniciar_motor_en_segundo_plano(app) -> None:
    """Carga las tablas base (síncrono) y lanza un hilo daemon para el tracking.

    Deja el estado en `app.state.motor`. Si ya hay un estado asignado (pruebas)
    no hace nada. La ruta de datos se puede sobrescribir con `app.state.dir_datos`.
    """
    if getattr(app.state, "motor", None) is not None:
        return
    dir_datos = getattr(app.state, "dir_datos", None) or DIR_DATOS
    base = cargar_motor_base(dir_datos)
    app.state.motor = base
    if base.estado == ERROR:
        return
    hilo = threading.Thread(target=_trabajo_en_hilo, args=(app, base, dir_datos),
                            name="precalculo-motor", daemon=True)
    hilo.start()
