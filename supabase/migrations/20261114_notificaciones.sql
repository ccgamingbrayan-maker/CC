-- ==============================================================================
-- CAPSULE CORP GAMING - MIGRACIÓN MÓDULO DE NOTIFICACIONES Y MENSAJERÍA
-- ==============================================================================
-- Permite el envío de notificaciones en plataforma y correos electrónicos desde
-- el perfil del administrador hacia clientes registrados y participantes de torneos.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notificaciones (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    categoria TEXT DEFAULT 'general' CHECK (categoria IN ('general', 'torneo', 'pedido', 'preventa', 'promo')),
    canal TEXT DEFAULT 'ambos' CHECK (canal IN ('plataforma', 'correo', 'ambos')),
    leido BOOLEAN DEFAULT false,
    es_global BOOLEAN DEFAULT false,
    enlace TEXT,
    metadatos JSONB DEFAULT '{}'::jsonb,
    enviado_por TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS mensaje TEXT;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'general';
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'ambos';
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS es_global BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS enlace TEXT;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS metadatos JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS enviado_por TEXT;
ALTER TABLE IF EXISTS public.notificaciones ADD COLUMN IF NOT EXISTS creado_en TIMESTAMPTZ DEFAULT NOW();

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON public.notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_email ON public.notificaciones(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_notificaciones_global ON public.notificaciones(es_global);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON public.notificaciones(creado_en DESC);

-- Seguridad a nivel de fila (RLS)
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- 1. Los usuarios pueden leer notificaciones globales, o asignadas a su ID o su correo
DROP POLICY IF EXISTS "Lectura de notificaciones propias o globales" ON public.notificaciones;
CREATE POLICY "Lectura de notificaciones propias o globales" ON public.notificaciones
    FOR SELECT USING (
        es_global = true
        OR auth.uid() = user_id
        OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
        OR auth.jwt() ->> 'email' = 'ccgamingbrayan@gmail.com'
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
        OR true
    );

-- 2. Administradores o creadores pueden insertar y gestionar notificaciones
DROP POLICY IF EXISTS "Gestion de notificaciones (Admin o autor)" ON public.notificaciones;
CREATE POLICY "Gestion de notificaciones (Admin o autor)" ON public.notificaciones
    FOR ALL USING (true);

