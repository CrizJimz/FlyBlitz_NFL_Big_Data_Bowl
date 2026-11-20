"""API de la plantilla. Ejecuta: .venv/bin/uvicorn backend.main:app --reload"""
import os
from pathlib import Path


def cargar_env():
    f = Path(__file__).resolve().parent.parent / ".env"
    if f.exists():
        for linea in f.read_text(encoding="utf-8-sig").splitlines():
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                k, v = linea.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


cargar_env()

from contextlib import asynccontextmanager  # noqa: E402

from fastapi import FastAPI  # noqa: E402

from .api import router  # noqa: E402
from .motor import config  # noqa: E402
from .motor.precalculo import cargar_motor_base  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga las tablas base al arrancar y deja el estado en `app.state.motor`.

    Respeta un estado ya asignado (pruebas) y permite sobrescribir la ruta de
    datos con `app.state.dir_datos`.
    """
    if getattr(app.state, "motor", None) is None:
        dir_datos = getattr(app.state, "dir_datos", None) or config.DIR_DATOS
        app.state.motor = cargar_motor_base(dir_datos)
    yield


app = FastAPI(title="Hackathon NFL UNAM", lifespan=lifespan)
app.include_router(router)


@app.get("/health")
def health() -> dict:
    """Responde siempre ok, incluso si el motor está en error."""
    return {"status": "ok"}
