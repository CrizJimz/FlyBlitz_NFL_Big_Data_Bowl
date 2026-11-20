---
inclusion: always
---

# Dominio NFL: reglas obligatorias

Complementa `.kiro/steering/rules.md` (stack, estructura y despliegue). Si hay conflicto, gana `rules.md`.

## Cero alucinaciones
- Nunca inventes columnas, valores ni cifras.
- Toda estadística sale de código Python (pandas) ejecutado sobre los CSV de `data/`.
- Antes de usar una columna, verifica que existe (`df.columns`) y revisa tipo y valores únicos.
- Si una columna es ambigua, márcala como "sin confirmar" y propón cómo verificarla (valores únicos, rangos, cruce con otra columna).
- No pegues CSV completos en el chat: usa `head()`, `describe()` o agregados.

## Geometría de campo
- El plano mide 120 x 53.3 yardas.
- Si `playDirection` es "left": `x = 120 - x`, `y = 53.3 - y`, y rota 180 grados `o` y `dir` (`(ang + 180) % 360`).
- Si `playDirection` es "right", no se transforma nada.
- Si el dataset no tiene `playDirection`, avisa al usuario antes de normalizar. No lo asumas ni lo deduzcas en silencio.

## Calidad de datos
- No elimines filas con nulos sin verificar si son estructurales.
- Ejemplo: `yardlineSide` vacío cuando `yardlineNumber` es 50 es esperado (medio campo).
- Para cada columna con nulos, cruza con otras columnas y documenta si el nulo es estructural o un dato faltante.

## Estilo de código
- Funciones pequeñas, de una sola responsabilidad, con comentarios y docstrings en español.
- Cálculos puros en `backend/`, sin escribir archivos en disco (el servidor es efímero).
- Los hallazgos documentados en el `README.md` deben poder reproducirse con el código del repo.
