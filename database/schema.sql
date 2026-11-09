-- ==============================================================================
-- HYDRA - Supabase PostgreSQL Database Schema
-- Monitoreo y Gestión Inteligente del Consumo Energético e Hídrico
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: profiles (Extensión del usuario de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT 'Usuario Hydra',
  avatar_url TEXT DEFAULT 'assets/avatar.png',
  level INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  daily_goal_liters NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  monthly_savings_currency NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  monthly_savings_water NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 3. TABLA: groups (Hogares / Familias)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Mi Hogar Hydra',
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_savings_water NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_savings_currency NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 4. TABLA: group_members (Miembros de cada grupo)
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE (group_id, user_id)
);

-- 5. TABLA: devices (Dispositivos HydraPod)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'HydraPod Principal',
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'active', 'standby')),
  wifi_ssid TEXT,
  battery_level INTEGER DEFAULT 100,
  paired_at TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 6. TABLA: shower_sessions (Historial de duchas y telemetría consolidada)
CREATE TABLE IF NOT EXISTS public.shower_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_liters NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  total_energy_kwh NUMERIC(6, 3) NOT NULL DEFAULT 0.000,
  cost_estimated NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  average_temperature_c NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
  peak_temperature_c NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
  average_flow_l_min NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
  peak_flow_l_min NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
  points_earned INTEGER NOT NULL DEFAULT 0,
  previous_goal_liters NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  new_goal_liters NUMERIC(5, 2),
  raw_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 7. TABLA: ai_recommendations (Consejos generados por Hydra Coach / Mistral)
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.shower_sessions(id) ON DELETE CASCADE,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_goal_liters NUMERIC(5, 2),
  model_used TEXT DEFAULT 'Mistral-7B',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 8. TABLA: challenges (Retos y gamificación grupal)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  deadline TEXT,
  reward_points INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==============================================================================

-- Trigger: Crear perfil automático al registrarse con Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'assets/avatar.png')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Actualizar puntos acumulados del usuario al completar una sesión
CREATE OR REPLACE FUNCTION public.handle_new_shower_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Sumar puntos al perfil del usuario
  UPDATE public.profiles
  SET 
    points = points + NEW.points_earned,
    daily_goal_liters = COALESCE(NEW.new_goal_liters, daily_goal_liters),
    monthly_savings_water = monthly_savings_water + GREATEST(0, (NEW.previous_goal_liters - NEW.total_liters)),
    monthly_savings_currency = monthly_savings_currency + (GREATEST(0, (NEW.previous_goal_liters - NEW.total_liters)) * 0.12),
    updated_at = TIMEZONE('utc', NOW())
  WHERE id = NEW.user_id;

  -- Si tiene grupo, actualizar métricas grupales
  IF NEW.group_id IS NOT NULL THEN
    UPDATE public.groups
    SET 
      total_savings_water = total_savings_water + GREATEST(0, (NEW.previous_goal_liters - NEW.total_liters)),
      total_savings_currency = total_savings_currency + (GREATEST(0, (NEW.previous_goal_liters - NEW.total_liters)) * 0.12),
      updated_at = TIMEZONE('utc', NOW())
    WHERE id = NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_shower_session_created ON public.shower_sessions;
CREATE TRIGGER on_shower_session_created
  AFTER INSERT ON public.shower_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_shower_session();

-- ==============================================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shower_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Políticas para Profiles
CREATE POLICY "Profiles son legibles por usuarios autenticados"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para Shower Sessions
CREATE POLICY "Usuarios pueden ver sus propias sesiones"
  ON public.shower_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus sesiones"
  ON public.shower_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para Recomendaciones IA
CREATE POLICY "Usuarios pueden ver sus recomendaciones de IA"
  ON public.ai_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Inserción de recomendaciones para el usuario"
  ON public.ai_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para Grupos
CREATE POLICY "Grupos son legibles por sus miembros"
  ON public.groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Cualquier usuario autenticado puede crear un grupo"
  ON public.groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Políticas para Group Members
CREATE POLICY "Miembros visibles para los del mismo grupo"
  ON public.group_members FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Unirse a un grupo"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas para Desafíos
CREATE POLICY "Desafíos legibles por usuarios autenticados"
  ON public.challenges FOR SELECT
  USING (auth.role() = 'authenticated');

-- ==============================================================================
-- REALTIME
-- ==============================================================================
-- Habilitar publicaciones Realtime para sincronizar paneles en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.shower_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

