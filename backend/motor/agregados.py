"""Agregados de la tabla por jugada: bloques `success_rate` y `coberturas`."""

import pandas as pd

from .config import RANGOS_DISTANCIA, RESULTADOS_PASE
from .exito import resumen_tasa

# Orden estable de los rangos de distancia: corta < media < larga.
_ORDEN_DISTANCIA = {clave: i for i, clave in enumerate(RANGOS_DISTANCIA)}


def contar_excluidas_down_0(df: pd.DataFrame) -> int:
    """Cuenta las jugadas con down 0 del subconjunto recibido.

    Es el valor de `n_excluidas_down_0` (llave de nivel superior en `/api/analisis`).
    """
    if len(df) == 0:
        return 0
    return int((df["down"] == 0).sum())


def _validas(df: pd.DataFrame) -> pd.DataFrame:
    """Devuelve solo las jugadas con down válido (1-4) y rango de distancia."""
    if len(df) == 0:
        return df
    return df[df["down_valido"].astype(bool) & df["rango_distancia"].notna()]


def _ordenar_grupos(grupos) -> list:
    """Ordena las llaves (down, distancia) por down y luego corta<media<larga."""
    return sorted(grupos, key=lambda g: (g[0], _ORDEN_DISTANCIA[g[1]]))


def bloque_success_rate(df: pd.DataFrame) -> dict:
    """Arma el bloque `success_rate` con el global y `por_down_distancia`.

    Usa solo jugadas con `down_valido`. Se omiten las combinaciones sin jugadas.
    Con tabla vacía devuelve global en ceros y lista vacía.
    """
    validas = _validas(df)
    if len(validas) == 0:
        return {"global": resumen_tasa(pd.Series([], dtype=bool)), "por_down_distancia": []}
    por_grupo = []
    grupos = validas.groupby(["down", "rango_distancia"], sort=False)
    llaves = _ordenar_grupos(list(grupos.groups.keys()))
    for down, distancia in llaves:
        resumen = resumen_tasa(grupos.get_group((down, distancia))["exitosa"])
        por_grupo.append({"down": int(down), "distancia": str(distancia), **resumen})
    return {"global": resumen_tasa(validas["exitosa"]), "por_down_distancia": por_grupo}


def _conteo_resultados(serie: pd.Series) -> dict:
    """Cuenta `resultado_pase` para C, I, S, R e IN (con ceros)."""
    conteo = serie.value_counts()
    return {r: int(conteo.get(r, 0)) for r in RESULTADOS_PASE}


def bloque_coberturas(df: pd.DataFrame) -> list:
    """Arma la lista de coberturas por `tipo_cobertura`, `down` y distancia.

    Cada elemento trae `n`, `success_rate`, `yardas_promedio` y el conteo de
    `resultado_pase`. Usa solo jugadas con `down_valido` y tipo de cobertura
    no nulo; los grupos vacíos no aparecen.
    """
    validas = _validas(df)
    if len(validas) == 0:
        return []
    validas = validas[validas["tipo_cobertura"].notna()]
    if len(validas) == 0:
        return []
    grupos = validas.groupby(["tipo_cobertura", "down", "rango_distancia"], sort=False)
    llaves = sorted(
        grupos.groups.keys(),
        key=lambda g: (g[1], _ORDEN_DISTANCIA[g[2]], str(g[0])),
    )
    salida = []
    for tipo, down, distancia in llaves:
        sub = grupos.get_group((tipo, down, distancia))
        salida.append(
            {
                "tipo_cobertura": str(tipo),
                "down": int(down),
                "distancia": str(distancia),
                "n": int(len(sub)),
                "success_rate": float(sub["exitosa"].mean()),
                "yardas_promedio": float(sub["yardas_sin_castigo"].mean()),
                "resultado_pase": _conteo_resultados(sub["resultado_pase"]),
            }
        )
    return salida


# Llaves de filtro aceptadas por `analizar`, en el orden de `filtros_aplicados`.
_LLAVES_FILTRO = ("ofensiva", "defensiva", "semana", "down", "distancia")

# Resultados con pase lanzado, en el orden de `separacion.por_resultado`.
_RESULTADOS_SEPARACION = ("C", "I", "IN")


def _flotante(valor) -> float:
    """Convierte a `float` de Python; devuelve 0.0 si el valor es nulo o NaN.

    Los floats se devuelven sin redondear.
    """
    if valor is None or pd.isna(valor):
        return 0.0
    return float(valor)


def bloque_bolsillo(df: pd.DataFrame) -> dict:
    """Arma el bloque `bolsillo` del subconjunto filtrado.

    Cuenta `n_con_pase`, `n_sin_pase` y `n_sin_snap` (suman las filas de `df`, incluido
    down 0). `n_con_respaldo_autoevent` son las `con_pase` con snap o pase de respaldo.
    `por_grupo` agrupa por `play_action` y `presion` solo las `con_pase`: promedio y
    mediana del tiempo y `success_rate` sobre las de `down_valido` (0.0 si el grupo no
    tiene ninguna). Los grupos vacíos se omiten. Con `df` vacío todo queda en cero.
    """
    if len(df) == 0:
        return {"n_con_pase": 0, "n_sin_pase": 0, "n_sin_snap": 0,
                "n_con_respaldo_autoevent": 0, "por_grupo": []}
    categoria = df["categoria_bolsillo"].astype(str)
    con_pase = df[categoria == "con_pase"]
    por_grupo = []
    if len(con_pase) > 0:
        grupos = con_pase.groupby(["play_action", "presion"], sort=True)
        for (play_action, presion), sub in grupos:
            validas = sub[sub["down_valido"].astype(bool)]
            tasa = float(validas["exitosa"].astype(bool).mean()) if len(validas) > 0 else 0.0
            por_grupo.append({
                "play_action": bool(play_action),
                "presion": bool(presion),
                "n": int(len(sub)),
                "tiempo_promedio_s": _flotante(sub["tiempo_bolsillo_s"].mean()),
                "tiempo_mediana_s": _flotante(sub["tiempo_bolsillo_s"].median()),
                "success_rate": tasa,
            })
    return {
        "n_con_pase": int(len(con_pase)),
        "n_sin_pase": int((categoria == "sin_pase").sum()),
        "n_sin_snap": int((categoria == "sin_snap").sum()),
        "n_con_respaldo_autoevent": int(con_pase["usa_respaldo"].astype(bool).sum()),
        "por_grupo": por_grupo,
    }


def bloque_separacion(df: pd.DataFrame) -> dict:
    """Arma el bloque `separacion` en el momento `pass_forward`.

    `n` son las jugadas con separación medida. `n_sin_receptor_identificado` son las
    C/I/IN sin medida (receptor no identificado o sin cuadro de pase). `por_resultado`
    trae C, I e IN con `n`, promedio y mediana de separación y velocidades promedio;
    los resultados sin jugadas medidas se omiten.
    """
    vacio = {"n": 0, "n_sin_receptor_identificado": 0, "momento": "pass_forward",
             "por_resultado": []}
    if len(df) == 0:
        return vacio
    lanzadas = df[df["resultado_pase"].isin(_RESULTADOS_SEPARACION)]
    medidas = lanzadas[lanzadas["separacion_yd"].notna()]
    por_resultado = []
    for resultado in _RESULTADOS_SEPARACION:
        sub = medidas[medidas["resultado_pase"] == resultado]
        if len(sub) == 0:
            continue
        por_resultado.append({
            "resultado_pase": resultado,
            "n": int(len(sub)),
            "separacion_promedio_yd": _flotante(sub["separacion_yd"].mean()),
            "separacion_mediana_yd": _flotante(sub["separacion_yd"].median()),
            "vel_receptor_promedio": _flotante(sub["vel_receptor"].mean()),
            "vel_defensor_promedio": _flotante(sub["vel_defensor"].mean()),
        })
    return {
        "n": int(len(medidas)),
        "n_sin_receptor_identificado": int(len(lanzadas) - len(medidas)),
        "momento": "pass_forward",
        "por_resultado": por_resultado,
    }


def analizar(tabla: pd.DataFrame, filtros: dict | None = None) -> dict:
    """Arma la respuesta completa de `GET /api/analisis` con la forma de `contrato-api.md`.

    `filtros` es un dict con las llaves `ofensiva`, `defensiva`, `semana`, `down` y
    `distancia` (las ausentes valen None). `n_jugadas` cuenta las filas del subconjunto
    filtrado, incluido down 0. Con subconjunto vacío devuelve ceros y listas vacías.
    Los floats no se redondean.
    """
    from .filtros import filtrar_jugadas  # import local: evita dependencia circular

    aplicados = {k: (filtros or {}).get(k) for k in _LLAVES_FILTRO}
    sub = filtrar_jugadas(tabla, **aplicados)
    return {
        "filtros_aplicados": aplicados,
        "n_jugadas": int(len(sub)),
        "n_excluidas_down_0": contar_excluidas_down_0(sub),
        "success_rate": bloque_success_rate(sub),
        "coberturas": bloque_coberturas(sub),
        "bolsillo": bloque_bolsillo(sub),
        "separacion": bloque_separacion(sub),
    }
