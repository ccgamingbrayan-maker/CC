-- ==============================================================================
-- SCRIPT DE ROLLBACK PARA ENDURECIMIENTO RLS
-- Archivo: supabase/migrations/20261026_rls_rollback.sql
-- Restaura el estado previo de políticas RLS y triggers de supabase_torneos.sql
-- ==============================================================================

BEGIN;

-- 1. Eliminar función de canje y triggers de protección de rol
DROP FUNCTION IF EXISTS public.canjear_item_prizewall(TEXT, INT);
DROP TRIGGER IF EXISTS trigger_protect_profile_role ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_role();

-- 2. Restaurar políticas de profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public_summary" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "Perfiles públicos para lectura" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Usuarios editan su propio perfil" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- 3. Restaurar políticas de torneos
DROP POLICY IF EXISTS "torneos_select_public" ON public.torneos;
DROP POLICY IF EXISTS "torneos_admin_mutation" ON public.torneos;

CREATE POLICY "Torneos públicos para lectura" ON public.torneos
    FOR SELECT USING (true);

CREATE POLICY "Gestionar torneos (Admin o autenticado)" ON public.torneos
    FOR ALL USING (
        auth.role() = 'authenticated' 
        OR auth.jwt() ->> 'email' = 'ccgamingbrayan@gmail.com'
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
        OR true
    );

-- 4. Restaurar políticas de torneo_participantes
DROP POLICY IF EXISTS "participantes_select_public" ON public.torneo_participantes;
DROP POLICY IF EXISTS "participantes_admin_mutation" ON public.torneo_participantes;

CREATE POLICY "Participantes públicos para lectura" ON public.torneo_participantes
    FOR SELECT USING (true);

CREATE POLICY "Gestionar participantes (Admin o autenticado)" ON public.torneo_participantes
    FOR ALL USING (true);

-- 5. Restaurar políticas de pedidos
DROP POLICY IF EXISTS "pedidos_select_owner_or_admin" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_insert_owner_or_admin" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_update_admin_only" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_delete_admin_only" ON public.pedidos;

CREATE POLICY "Pedidos públicos para lectura" ON public.pedidos
    FOR SELECT USING (true);

CREATE POLICY "Gestionar pedidos (Admin o usuario)" ON public.pedidos
    FOR ALL USING (true);

-- 6. Restaurar políticas de catalogo_premios
DROP POLICY IF EXISTS "catalogo_premios_select_public" ON public.catalogo_premios;
DROP POLICY IF EXISTS "catalogo_premios_admin_all" ON public.catalogo_premios;

CREATE POLICY "Permitir lectura publica catalogo_premios" ON public.catalogo_premios
    FOR SELECT TO public USING (true);

CREATE POLICY "Permitir administracion completa catalogo_premios" ON public.catalogo_premios
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Restaurar políticas de prizewall
DROP POLICY IF EXISTS "prizewall_items_select_public" ON public.prizewall_items;
DROP POLICY IF EXISTS "prizewall_items_admin_all" ON public.prizewall_items;
DROP POLICY IF EXISTS "prizewall_canjes_select" ON public.prizewall_canjes;
DROP POLICY IF EXISTS "prizewall_canjes_admin_all" ON public.prizewall_canjes;

CREATE POLICY "Lectura publica prizewall_items" ON public.prizewall_items
    FOR SELECT TO public USING (true);

CREATE POLICY "Gestion prizewall_items" ON public.prizewall_items
    FOR ALL USING (true);

CREATE POLICY "Lectura publica prizewall_canjes" ON public.prizewall_canjes
    FOR SELECT TO public USING (true);

CREATE POLICY "Gestion prizewall_canjes" ON public.prizewall_canjes
    FOR ALL USING (true);

COMMIT;
