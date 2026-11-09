
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

## Backend (Node + Express + Supabase)
- `src/index.js` expone `/api/chat`, `/api/recommendations`, `/api/config/public`, `/api/user/:id/profile`, `/api/user/:id/sessions`, y `/api/leaderboard`.
- `HuggingFaceService` centraliza la interacción con el modelo Mistral (chat + insights).
- `SupabaseService` (`src/services/supabase-service.js`) gestiona la persistencia de usuarios, sesiones de ducha, recomendaciones de IA y rankings.
- Esquema de base de datos listo en `database/schema.sql` (compatible con Supabase PostgreSQL, RLS y Realtime).

## Configuración de Supabase
1. En tu proyecto de [Supabase](https://supabase.com), ve al **SQL Editor** y ejecuta el script completo [`database/schema.sql`](file:///c:/Users/LENOVO/Downloads/MT/HYDRA/HYDRA/database/schema.sql).
2. Obtén la URL y las claves en **Project Settings > API**.
3. Añade los valores en tu archivo `.env`:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```
*Nota: Si las claves de Supabase no están configuradas, el sistema funcionará automáticamente en modo de simulación/demo local sin interrumpir la app.*

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
