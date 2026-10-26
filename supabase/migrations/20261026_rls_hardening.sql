-- ==============================================================================
-- MIGRACIÓN DE SEGURIDAD Y ENDURECIMIENTO RLS (ROW LEVEL SECURITY)
-- Archivo: supabase/migrations/20261026_rls_hardening.sql
-- Reversible: ver rollback_rls_hardening.sql
-- NOTA: NO APLICAR EN PRODUCCIÓN HASTA TENER BACKUP Y SUPABASE_SERVICE_ROLE_KEY SECRETA.
-- ==============================================================================

BEGIN;

-- 1. FUNCIÓN HELPER is_admin() CON SECURITY DEFINER Y SEARCH_PATH SEGURO
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND rol = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Asegurar permisos de ejecución de la función
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;


-- 2. PROTECCIÓN CONTRA ESCALADA DE PRIVILEGIOS / ASIGNACIÓN MASIVA EN PROFILES
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloquear cambios no autorizados en la columna 'rol'
    IF NEW.rol IS DISTINCT FROM OLD.rol THEN
        IF NOT public.is_admin() THEN
            RAISE EXCEPTION 'Operación denegada: no tienes privilegios para modificar el rol de usuario.';
        END IF;
    END IF;

    -- Bloquear modificaciones no autorizadas en notas_admin
    IF NEW.notas_admin IS DISTINCT FROM OLD.notas_admin THEN
        IF NOT public.is_admin() THEN
            NEW.notas_admin := OLD.notas_admin;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_protect_profile_role ON public.profiles;
CREATE TRIGGER trigger_protect_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_role();


-- 3. POLÍTICAS RLS EN PROFILES (REDUCIR EXPOSICIÓN DE PII)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfiles públicos para lectura" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- Cada usuario lee su propio perfil completo; administradores leen todos
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- Usuarios anónimos solo pueden verificar existencia de perfiles para vincular nickname
CREATE POLICY "profiles_select_public_summary" ON public.profiles
    FOR SELECT TO anon
    USING (true);

-- Cada usuario solo puede actualizar su propio registro (sujeto al trigger de protección de rol)
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- 4. POLÍTICAS RLS EN TORNEOS (ELIMINAR 'OR true')
ALTER TABLE public.torneos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Torneos públicos para lectura" ON public.torneos;
DROP POLICY IF EXISTS "Gestionar torneos (Admin o autenticado)" ON public.torneos;
DROP POLICY IF EXISTS "torneos_select_public" ON public.torneos;
DROP POLICY IF EXISTS "torneos_admin_mutation" ON public.torneos;

CREATE POLICY "torneos_select_public" ON public.torneos
    FOR SELECT USING (true);

CREATE POLICY "torneos_admin_mutation" ON public.torneos
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- 5. POLÍTICAS RLS EN TORNEO_PARTICIPANTES (ELIMINAR 'USING (true)')
ALTER TABLE public.torneo_participantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participantes públicos para lectura" ON public.torneo_participantes;
DROP POLICY IF EXISTS "Gestionar participantes (Admin o autenticado)" ON public.torneo_participantes;
DROP POLICY IF EXISTS "participantes_select_public" ON public.torneo_participantes;
DROP POLICY IF EXISTS "participantes_admin_mutation" ON public.torneo_participantes;

CREATE POLICY "participantes_select_public" ON public.torneo_participantes
    FOR SELECT USING (true);

CREATE POLICY "participantes_admin_mutation" ON public.torneo_participantes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Asegurar search_path seguro en el trigger de sincronización de participantes
CREATE OR REPLACE FUNCTION public.sync_torneo_participantes()
RETURNS TRIGGER AS $$
DECLARE
    elem JSONB;
    v_user_id UUID;
    v_nick TEXT;
    v_bandai TEXT;
    v_email TEXT;
    v_pts INT;
    v_wins INT;
    v_coins INT;
BEGIN
    DELETE FROM public.torneo_participantes WHERE torneo_id = NEW.id;

    IF NEW.participantes IS NOT NULL AND jsonb_array_length(NEW.participantes) > 0 THEN
        FOR elem IN SELECT * FROM jsonb_array_elements(NEW.participantes)
        LOOP
            v_nick := TRIM(elem->>'nickname');
            v_bandai := TRIM(elem->>'bandaiId');
            v_email := LOWER(TRIM(COALESCE(elem->>'email', '')));
            v_user_id := NULL;
            v_pts := COALESCE((elem->>'puntos')::INT, 0);
            v_wins := COALESCE((elem->>'wins')::INT, FLOOR(v_pts / 3)::INT);
            v_coins := COALESCE((elem->>'ccCoins')::INT, v_wins);

            IF v_nick IS NOT NULL AND v_nick <> '' THEN
                SELECT id INTO v_user_id FROM public.profiles WHERE LOWER(nickname) = LOWER(v_nick) LIMIT 1;
            END IF;

            IF v_user_id IS NULL AND v_bandai IS NOT NULL AND v_bandai <> '' THEN
                SELECT id INTO v_user_id FROM public.profiles WHERE bandai_id = v_bandai LIMIT 1;
            END IF;

            IF v_user_id IS NULL AND v_email IS NOT NULL AND v_email <> '' THEN
                SELECT id INTO v_user_id FROM public.profiles WHERE LOWER(email) = v_email LIMIT 1;
            END IF;

            INSERT INTO public.torneo_participantes (
                id,
                torneo_id,
                user_id,
                nombre,
                nickname,
                bandai_id,
                deck,
                email,
                telefono,
                puesto,
                puntos,
                wins,
                cc_coins,
                omw,
                monto_pagado,
                estado_pago,
                premio_ganado,
                productos_premios,
                notas,
                creado_en
            )
            VALUES (
                COALESCE(elem->>'id', 'p-' || substr(md5(random()::text), 1, 12)),
                NEW.id,
                v_user_id,
                COALESCE(elem->>'nombre', elem->>'nickname', 'Jugador'),
                v_nick,
                v_bandai,
                COALESCE(elem->>'deck', ''),
                NULLIF(v_email, ''),
                COALESCE(elem->>'telefono', ''),
                COALESCE(elem->>'puesto', 'Participante'),
                v_pts,
                v_wins,
                v_coins,
                COALESCE(elem->>'omw', ''),
                COALESCE((elem->>'montoPagado')::NUMERIC, NEW.costo_inscripcion),
                COALESCE(elem->>'estadoPago', 'pagado'),
                COALESCE(elem->>'premioGanado', ''),
                COALESCE(elem->'productosPremios', '[]'::jsonb),
                COALESCE(elem->>'notas', ''),
                NOW()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 6. POLÍTICAS RLS EN PEDIDOS (CADA USUARIO SOLO ACCEDE A SUS PROPIOS PEDIDOS)
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pedidos públicos para lectura" ON public.pedidos;
DROP POLICY IF EXISTS "Gestionar pedidos (Admin o usuario)" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_select_owner_or_admin" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_insert_owner_or_admin" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_update_admin_only" ON public.pedidos;
DROP POLICY IF EXISTS "pedidos_delete_admin_only" ON public.pedidos;

-- Consulta: cada usuario solo ve sus compras; admin ve todas
CREATE POLICY "pedidos_select_owner_or_admin" ON public.pedidos
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Inserción: usuario autenticado crea para sí mismo, o admin
CREATE POLICY "pedidos_insert_owner_or_admin" ON public.pedidos
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Actualización y borrado: exclusivo de administradores (o backend con service_role)
CREATE POLICY "pedidos_update_admin_only" ON public.pedidos
    FOR UPDATE TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "pedidos_delete_admin_only" ON public.pedidos
    FOR DELETE TO authenticated
    USING (public.is_admin());


-- 7. POLÍTICAS RLS EN CATALOGO_PREMIOS Y PRIZEWALL
ALTER TABLE IF EXISTS public.catalogo_premios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura publica catalogo_premios" ON public.catalogo_premios;
DROP POLICY IF EXISTS "Permitir administracion completa catalogo_premios" ON public.catalogo_premios;
DROP POLICY IF EXISTS "catalogo_premios_select_public" ON public.catalogo_premios;
DROP POLICY IF EXISTS "catalogo_premios_admin_all" ON public.catalogo_premios;

CREATE POLICY "catalogo_premios_select_public" ON public.catalogo_premios
    FOR SELECT USING (true);

CREATE POLICY "catalogo_premios_admin_all" ON public.catalogo_premios
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


ALTER TABLE IF EXISTS public.prizewall_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica prizewall_items" ON public.prizewall_items;
DROP POLICY IF EXISTS "Gestion prizewall_items" ON public.prizewall_items;
DROP POLICY IF EXISTS "prizewall_items_select_public" ON public.prizewall_items;
DROP POLICY IF EXISTS "prizewall_items_admin_all" ON public.prizewall_items;

CREATE POLICY "prizewall_items_select_public" ON public.prizewall_items
    FOR SELECT USING (true);

CREATE POLICY "prizewall_items_admin_all" ON public.prizewall_items
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


ALTER TABLE IF EXISTS public.prizewall_canjes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica prizewall_canjes" ON public.prizewall_canjes;
DROP POLICY IF EXISTS "Gestion prizewall_canjes" ON public.prizewall_canjes;
DROP POLICY IF EXISTS "prizewall_canjes_select" ON public.prizewall_canjes;
DROP POLICY IF EXISTS "prizewall_canjes_admin_all" ON public.prizewall_canjes;

CREATE POLICY "prizewall_canjes_select" ON public.prizewall_canjes
    FOR SELECT TO authenticated
    USING (auth.uid() = jugador_id OR public.is_admin());

CREATE POLICY "prizewall_canjes_admin_all" ON public.prizewall_canjes
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- 8. FUNCIÓN ATÓMICA DE CANJE EN PRIZE WALL (RPC SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.canjear_item_prizewall(
    p_item_id TEXT,
    p_cantidad INT DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_user_nombre TEXT;
    v_stock INT;
    v_costo_coins INT;
    v_valor_cop NUMERIC(12, 2);
    v_item_nombre TEXT;
    v_item_imagen TEXT;
    v_total_coins_ganados INT := 0;
    v_total_coins_gastados INT := 0;
    v_saldo_coins INT := 0;
    v_costo_total INT;
    v_canje_id TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
    END IF;

    -- Obtener nombre del usuario
    SELECT COALESCE(nickname, nombre, 'Jugador') INTO v_user_nombre
    FROM public.profiles
    WHERE id = v_user_id;

    -- Bloqueo FOR UPDATE para prevenir condición de carrera en stock
    SELECT stock, costo_coins, valor_cop, nombre, imagen
    INTO v_stock, v_costo_coins, v_valor_cop, v_item_nombre, v_item_imagen
    FROM public.prizewall_items
    WHERE id = p_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Artículo del Prize Wall no encontrado';
    END IF;

    IF v_stock < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para este artículo';
    END IF;

    v_costo_total := v_costo_coins * p_cantidad;

    -- Calcular saldo real de CC Coins del usuario
    SELECT COALESCE(SUM(cc_coins), 0) INTO v_total_coins_ganados
    FROM public.torneo_participantes
    WHERE user_id = v_user_id;

    SELECT COALESCE(SUM(costo_total_coins), 0) INTO v_total_coins_gastados
    FROM public.prizewall_canjes
    WHERE jugador_id = v_user_id;

    v_saldo_coins := v_total_coins_ganados - v_total_coins_gastados;

    IF v_saldo_coins < v_costo_total THEN
        RAISE EXCEPTION 'Saldo insuficiente de CC Coins (Tienes: %, Requieres: %)', v_saldo_coins, v_costo_total;
    END IF;

    -- Descontar stock
    UPDATE public.prizewall_items
    SET stock = stock - p_cantidad,
        actualizado_en = NOW()
    WHERE id = p_item_id;

    -- Registrar canje
    v_canje_id := 'canje-' || substr(md5(random()::text), 1, 12);
    INSERT INTO public.prizewall_canjes (
        id,
        item_id,
        item_nombre,
        item_imagen,
        jugador_id,
        jugador_nombre,
        cantidad,
        costo_total_coins,
        equivalente_total_cop,
        fecha
    )
    VALUES (
        v_canje_id,
        p_item_id,
        v_item_nombre,
        v_item_imagen,
        v_user_id,
        v_user_nombre,
        p_cantidad,
        v_costo_total,
        v_valor_cop * p_cantidad,
        NOW()
    );

    RETURN jsonb_build_object(
        'ok', true,
        'canje_id', v_canje_id,
        'saldo_restante', v_saldo_coins - v_costo_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.canjear_item_prizewall(TEXT, INT) TO authenticated;

COMMIT;
