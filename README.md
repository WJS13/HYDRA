
# HYDRA

Demo del MVP mobile-first para controlar HydraPod, el asistente de duchas inteligentes.

## Caracteristicas principales
- Pantallas separadas para login/registro, emparejamiento, dashboard, telemetria en vivo, resumen, historial y mas.
- Simulacion de telemetria (flujo, potencia, temperatura) y calculo de ahorro.
- Integracion con Hugging Face (Mistral) para generar recomendaciones y ajustar la meta diaria.
- Persistencia local de meta diaria, ranking familiar y ultimos insights recomendados.
- Estructura 100% HTML/CSS/JS (ESM en backend) lista para conectar con MQTT + base de datos.

## Flujo del MVP
1. `index.html` muestra splash/login/registro y dirige a pairing o join.
2. `pairing.html` simula el escaneo QR y conexion WiFi.
3. `dashboard.html` muestra meta, ahorros y ranking familiar.
4. `live.html` simula la ducha en tiempo real y envia el resumen a `/api/recommendations`.
5. `summary.html` presenta metricas reales, nuevas recomendaciones y la meta propuesta por Mistral.
6. `history.html`, `group.html`, `challenges.html`, `ranking.html`, `profile.html`, etc. completan el flujo del usuario.

## Backend (Node + Express)
- `src/index.js` expone `/api/chat` y `/api/recommendations` usando `ChatController`.
- `HuggingFaceService` centraliza la interaccion con el modelo (chat + insights).
- Configuracion requerida: `HUGGINGFACE_API_TOKEN` y (opcional) `MISTRAL_MODEL` en `.env`.

## Desarrollo
```bash
npm install
npm start
```

El servidor sirve el contenido de `public/` y mantiene la logica de recomendaciones.

## Proximos pasos
- Conectar telemetria real via MQTT y persistir sesiones en base de datos.
- Anadir autenticacion real y manejo multiusuario.
- Internacionalizacion y accesibilidad.
- Panel B2B (`admin.html`).
