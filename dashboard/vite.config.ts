import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' para que el build funcione desde cualquier ruta (la app se publica en una subruta).
// El proxy solo aplica en desarrollo: manda /api al backend de FastAPI (Uvicorn, puerto 8000).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
