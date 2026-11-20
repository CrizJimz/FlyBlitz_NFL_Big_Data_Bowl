"""Rutas y constantes del motor de datos."""

from pathlib import Path

# Raíz del proyecto (padre de `backend/`).
RAIZ = Path(__file__).resolve().parents[2]

# Carpeta de solo lectura con los CSV originales.
DIR_DATOS = RAIZ / "data/nfl-big-data-bowl-regional-event-data/data"

# Cuadros por segundo del tracking.
FPS = 10

# Dimensiones del campo en yardas.
LARGO = 120.0
ANCHO = 53.3

# Rangos de yardsToGo (mínimo, máximo); máximo None significa sin límite.
RANGOS_DISTANCIA = {"corta": (1, 3), "media": (4, 7), "larga": (8, None)}

# Valores posibles de passResult en las jugadas de dropback.
RESULTADOS_PASE = ("C", "I", "S", "R", "IN")

# Resultados en que el balón fue lanzado (completo, incompleto, intercepción).
PASE_CON_BALON = ("C", "I", "IN")

# Eventos de tracking, en orden: primario (manual), respaldo (automático).
SNAP = ("ball_snap", "autoevent_ballsnap")
PASE = ("pass_forward", "autoevent_passforward")
