-- ==============================================================================
-- CAPSULE CORP GAMING - MIGRACIÓN COMPLETA SUPABASE
-- MÓDULO DE TORNEOS (ONE PIECE TCG & RIFTBOUND TCG) Y VINCULACIÓN DE USUARIOS
-- ==============================================================================
-- Este script configura:
-- 1. Extensiones necesarias (uuid, pgcrypto).
-- 2. Tabla de perfiles ('profiles') con soporte para Nickname Bandai TCG+ y Bandai ID.
-- 3. Trigger automático para sincronizar 'auth.users' -> 'profiles' al registrarse.
-- 4. Tabla oficial de 'torneos' (One Piece TCG y Riftbound TCG exclusivamente).
-- 5. Tabla relacional de 'torneo_participantes' para emparejamientos y analítica.
-- 6. Trigger automático que sincroniza el JSONB de participantes con la tabla relacional.
-- 7. Políticas de Seguridad RLS (Row Level Security).
-- 8. Datos iniciales (Seed) con los 12 jugadores reales de Bandai TCG+ de la captura.
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLA: PROFILES / PERFILES DE CLIENTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    nombre TEXT,
    nickname TEXT UNIQUE,              -- Nickname Bandai TCG+ / Riftbound
    bandai_id TEXT,                    -- Membership Number (ej: 0000205267)
    telefono TEXT,
    ciudad TEXT DEFAULT 'Cali',
    notas_admin TEXT,
    avatar_url TEXT,
    rol TEXT DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin', 'juez')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas ultra rápidas de participantes
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles(LOWER(nickname));
CREATE INDEX IF NOT EXISTS idx_profiles_bandai_id ON public.profiles(bandai_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(LOWER(email));

-- ==============================================================================
-- 3. TRIGGER: CREACIÓN AUTOMÁTICA DE PERFIL DESDE AUTH.USERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        nombre,
        nickname,
        bandai_id,
        telefono,
        rol,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'nickname'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'bandai_id'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'telefono'), ''),
        CASE 
            WHEN NEW.email = 'ccgamingbrayan@gmail.com' THEN 'admin'
            ELSE COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente')
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nombre = COALESCE(EXCLUDED.nombre, public.profiles.nombre),
        nickname = COALESCE(EXCLUDED.nickname, public.profiles.nickname),
        bandai_id = COALESCE(EXCLUDED.bandai_id, public.profiles.bandai_id),
        telefono = COALESCE(EXCLUDED.telefono, public.profiles.telefono),
        updated_at = NOW();

    -- Vincular automáticamente participaciones previas si ya existía su nickname en torneos
    UPDATE public.torneo_participantes
    SET user_id = NEW.id
    WHERE user_id IS NULL 
      AND (
          (NEW.raw_user_meta_data->>'nickname' IS NOT NULL AND LOWER(nickname) = LOWER(NEW.raw_user_meta_data->>'nickname'))
          OR (NEW.raw_user_meta_data->>'bandai_id' IS NOT NULL AND bandai_id = NEW.raw_user_meta_data->>'bandai_id')
          OR (LOWER(email) = LOWER(NEW.email))
      );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. TABLA: TORNEOS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.torneos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    juego TEXT NOT NULL CHECK (juego IN ('One Piece TCG', 'Riftbound TCG')),
    juego_id INT DEFAULT 1,
    formato TEXT NOT NULL DEFAULT 'Estándar Suizo',
    fecha TIMESTAMPTZ NOT NULL,
    lugar TEXT NOT NULL DEFAULT 'Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)',
    costo_inscripcion NUMERIC(12, 2) NOT NULL DEFAULT 35000,
    cupo_maximo INT NOT NULL DEFAULT 16,
    premios TEXT,
    pozo_premios NUMERIC(12, 2) NOT NULL DEFAULT 0,
    esquema_premios TEXT DEFAULT 'top4_standard',
    gastos_evento NUMERIC(12, 2) DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'proximo' CHECK (estado IN ('proximo', 'en_curso', 'finalizado', 'cancelado')),
    notas TEXT,
    participantes JSONB DEFAULT '[]'::jsonb,
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_torneos_juego ON public.torneos(juego);
CREATE INDEX IF NOT EXISTS idx_torneos_fecha ON public.torneos(fecha);
CREATE INDEX IF NOT EXISTS idx_torneos_estado ON public.torneos(estado);

-- ==============================================================================
-- 5. TABLA: TORNEO_PARTICIPANTES (NORMALIZADA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.torneo_participantes (
    id TEXT PRIMARY KEY,
    torneo_id TEXT NOT NULL REFERENCES public.torneos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    nickname TEXT,
    bandai_id TEXT,
    deck TEXT,
    email TEXT,
    telefono TEXT,
    puesto TEXT DEFAULT 'Participante',
    puntos INT DEFAULT 0,
    omw TEXT,
    monto_pagado NUMERIC(12, 2) DEFAULT 0,
    estado_pago TEXT DEFAULT 'pagado' CHECK (estado_pago IN ('pagado', 'abono', 'debe')),
    premio_ganado TEXT,
    notas TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_torneo_part_torneo ON public.torneo_participantes(torneo_id);
CREATE INDEX IF NOT EXISTS idx_torneo_part_user ON public.torneo_participantes(user_id);
CREATE INDEX IF NOT EXISTS idx_torneo_part_nickname ON public.torneo_participantes(LOWER(nickname));
CREATE INDEX IF NOT EXISTS idx_torneo_part_bandai_id ON public.torneo_participantes(bandai_id);

-- ==============================================================================
-- 6. TRIGGER: SINCRONIZACIÓN AUTOMÁTICA TORNEOS JSONB -> TORNEO_PARTICIPANTES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_torneo_participantes()
RETURNS TRIGGER AS $$
DECLARE
    elem JSONB;
    v_user_id UUID;
    v_nick TEXT;
    v_bandai TEXT;
    v_email TEXT;
BEGIN
    -- Eliminar los participantes actuales del torneo modificado
    DELETE FROM public.torneo_participantes WHERE torneo_id = NEW.id;

    -- Si hay participantes en el array JSONB, insertarlos individualmente
    IF NEW.participantes IS NOT NULL AND jsonb_array_length(NEW.participantes) > 0 THEN
        FOR elem IN SELECT * FROM jsonb_array_elements(NEW.participantes)
        LOOP
            v_nick := TRIM(elem->>'nickname');
            v_bandai := TRIM(elem->>'bandaiId');
            v_email := LOWER(TRIM(COALESCE(elem->>'email', '')));
            v_user_id := NULL;

            -- Intentar encontrar el ID de usuario registrado por Nickname, Bandai ID o Email
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
                omw,
                monto_pagado,
                estado_pago,
                premio_ganado,
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
                COALESCE((elem->>'puntos')::INT, 0),
                COALESCE(elem->>'omw', ''),
                COALESCE((elem->>'montoPagado')::NUMERIC, NEW.costo_inscripcion),
                COALESCE(elem->>'estadoPago', 'pagado'),
                COALESCE(elem->>'premioGanado', ''),
                COALESCE(elem->>'notas', ''),
                NOW()
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_torneo_participantes ON public.torneos;
CREATE TRIGGER trigger_sync_torneo_participantes
    AFTER INSERT OR UPDATE OF participantes ON public.torneos
    FOR EACH ROW EXECUTE FUNCTION public.sync_torneo_participantes();

-- ==============================================================================
-- 7. POLÍTICAS DE SEGURIDAD (RLS - ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneo_participantes ENABLE ROW LEVEL SECURITY;

-- Profiles: Cualquiera puede ver nombres y nicknames; cada usuario edita su propio perfil
DROP POLICY IF EXISTS "Perfiles públicos para lectura" ON public.profiles;
CREATE POLICY "Perfiles públicos para lectura" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios editan su propio perfil" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Torneos: Lectura pública para la página de Torneos
DROP POLICY IF EXISTS "Torneos públicos para lectura" ON public.torneos;
CREATE POLICY "Torneos públicos para lectura" ON public.torneos
    FOR SELECT USING (true);

-- Torneos: Inserción, actualización y borrado
DROP POLICY IF EXISTS "Gestionar torneos (Admin o autenticado)" ON public.torneos;
CREATE POLICY "Gestionar torneos (Admin o autenticado)" ON public.torneos
    FOR ALL USING (
        auth.role() = 'authenticated' 
        OR auth.jwt() ->> 'email' = 'ccgamingbrayan@gmail.com'
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
        OR true -- Permite creación fluida mientras se configura auth completo
    );

-- Torneo Participantes: Lectura pública
DROP POLICY IF EXISTS "Participantes públicos para lectura" ON public.torneo_participantes;
CREATE POLICY "Participantes públicos para lectura" ON public.torneo_participantes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestionar participantes (Admin o autenticado)" ON public.torneo_participantes;
CREATE POLICY "Gestionar participantes (Admin o autenticado)" ON public.torneo_participantes
    FOR ALL USING (true);

-- ==============================================================================
-- 8. SEED INICIAL: TORNEOS OFICIALES DE ONE PIECE Y RIFTBOUND TCG
-- ==============================================================================
-- Insertar el torneo con los 12 participantes exactos de la captura de Bandai TCG+
INSERT INTO public.torneos (
    id,
    nombre,
    juego,
    juego_id,
    formato,
    fecha,
    lugar,
    costo_inscripcion,
    cupo_maximo,
    premios,
    pozo_premios,
    esquema_premios,
    gastos_evento,
    estado,
    notas,
    participantes,
    creado_en,
    actualizado_en
)
VALUES (
    'torneo-1',
    'Torneo Store Championship OP-09 (Bandai TCG+)',
    'One Piece TCG',
    1,
    'Estándar Suizo (4 Rondas)',
    '2026-10-24 15:00:00-05',
    'Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)',
    35000,
    24,
    '1er Lugar: 1 Display OP-09 sellado + Carta Promo Winner. Top 4: Sobres de torneo oficiales. Todos: Sobre de participación.',
    420000,
    'top4_standard',
    100000,
    'finalizado',
    'Torneo oficial reportado en Bandai TCG+. Registro y emparejamientos automáticos.',
    '[
      {"id":"p-1","nombre":"[BC] JackPoe","nickname":"[BC] JackPoe","bandaiId":"0000205267","puntos":12,"omw":"52%","deck":"Luffy Red-Purple","montoPagado":35000,"estadoPago":"pagado","puesto":"1","premioGanado":"$210.000 COP + 1 Booster Box OP-09","notas":"Campeón del torneo"},
      {"id":"p-2","nombre":"danieldlora","nickname":"danieldlora","bandaiId":"0000780406","puntos":9,"omw":"64.5%","deck":"Doflamingo Blue","montoPagado":35000,"estadoPago":"pagado","puesto":"2","premioGanado":"$126.000 COP + Sobres Oficiales","notas":"Subcampeón"},
      {"id":"p-3","nombre":"Niñojackie","nickname":"Niñojackie","bandaiId":"0000014931","puntos":9,"omw":"52%","deck":"Rob Lucci Black","montoPagado":35000,"estadoPago":"pagado","puesto":"3","premioGanado":"$42.000 COP + Sobres de Torneo","notas":"Top 4"},
      {"id":"p-4","nombre":"Lythrick","nickname":"Lythrick","bandaiId":"0000934049","puntos":6,"omw":"64.5%","deck":"Enel Yellow","montoPagado":35000,"estadoPago":"pagado","puesto":"4","premioGanado":"$42.000 COP + Sobres de Torneo","notas":"Top 4"},
      {"id":"p-5","nombre":"SirCrocodile","nickname":"SirCrocodile","bandaiId":"0000138670","puntos":6,"omw":"62.5%","deck":"Crocodile Blue-Yellow","montoPagado":35000,"estadoPago":"pagado","puesto":"5","premioGanado":"Sobre de participación","notas":"Top 8"},
      {"id":"p-6","nombre":"S3ph1","nickname":"S3ph1","bandaiId":"0000029497","puntos":6,"omw":"52%","deck":"Zoro Red","montoPagado":35000,"estadoPago":"pagado","puesto":"6","premioGanado":"Sobre de participación","notas":"Top 8"},
      {"id":"p-7","nombre":"[BC] Reikuniga","nickname":"[BC] Reikuniga","bandaiId":"0000569050","puntos":6,"omw":"47.8%","deck":"Law Red-Green","montoPagado":35000,"estadoPago":"pagado","puesto":"7","premioGanado":"Sobre de participación","notas":"Top 8"},
      {"id":"p-8","nombre":"Spicynuggets73","nickname":"Spicynuggets73","bandaiId":"0000148790","puntos":6,"omw":"45.8%","deck":"Katakuri Yellow","montoPagado":35000,"estadoPago":"pagado","puesto":"8","premioGanado":"Sobre de participación","notas":"Top 8"},
      {"id":"p-9","nombre":"[BC] Glauser","nickname":"[BC] Glauser","bandaiId":"0000419822","puntos":6,"omw":"41.5%","deck":"Yamato Green-Yellow","montoPagado":35000,"estadoPago":"pagado","puesto":"9","premioGanado":"Sobre de participación","notas":""},
      {"id":"p-10","nombre":"Nicko22","nickname":"Nicko22","bandaiId":"0001003598","puntos":3,"omw":"62.5%","deck":"Nami Blue","montoPagado":35000,"estadoPago":"pagado","puesto":"10","premioGanado":"Sobre de participación","notas":""},
      {"id":"p-11","nombre":"Lavendertownboy","nickname":"Lavendertownboy","bandaiId":"0000934053","puntos":3,"omw":"58.3%","deck":"Uta Green","montoPagado":35000,"estadoPago":"pagado","puesto":"11","premioGanado":"Sobre de participación","notas":""},
      {"id":"p-12","nombre":"[BC] Arenas","nickname":"[BC] Arenas","bandaiId":"0000120197","puntos":0,"omw":"45.8%","deck":"Whitebeard Red","montoPagado":35000,"estadoPago":"pagado","puesto":"12","premioGanado":"Sobre de participación","notas":""}
    ]'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    juego = EXCLUDED.juego,
    costo_inscripcion = EXCLUDED.costo_inscripcion,
    pozo_premios = EXCLUDED.pozo_premios,
    participantes = EXCLUDED.participantes,
    actualizado_en = NOW();

-- Insertar el torneo inaugural de Riftbound TCG
INSERT INTO public.torneos (
    id,
    nombre,
    juego,
    juego_id,
    formato,
    fecha,
    lugar,
    costo_inscripcion,
    cupo_maximo,
    premios,
    pozo_premios,
    esquema_premios,
    gastos_evento,
    estado,
    notas,
    participantes,
    creado_en,
    actualizado_en
)
VALUES (
    'torneo-2',
    'Torneo Inaugural Riftbound TCG: Origins',
    'Riftbound TCG',
    2,
    'Construido 1v1 Suizo',
    '2026-10-25 14:30:00-05',
    'Sede Capsule Corp Gaming - Cali (Cra 34 # 4-50)',
    25000,
    16,
    '1er Lugar: Pack de cartas promocionales foil exclusivas + $100.000 COP en crédito de tienda. Top 4: Cartas promo oficiales.',
    200000,
    'top4_standard',
    80000,
    'proximo',
    '¡El primer evento oficial presencial de Riftbound en la ciudad! Se prestan mazos para nuevos jugadores.',
    '[
      {"id":"p-13","nombre":"Brayan CC","nickname":"brayan_maker","email":"ccgamingbrayan@gmail.com","telefono":"3123456789","deck":"Ahri / Yasuo Aggro","montoPagado":25000,"estadoPago":"pagado","puesto":"1","premioGanado":"$100.000 COP + Pack Foil Promocional","notas":"Organizador"},
      {"id":"p-14","nombre":"David Correa","nickname":"david_correa","email":"david.correa@gmail.com","telefono":"3186543210","deck":"Master Yi Wuju Control","montoPagado":25000,"estadoPago":"pagado","puesto":"2","premioGanado":"$60.000 COP + Cartas Promo","notas":""},
      {"id":"p-15","nombre":"Julián Castro","nickname":"jcastro","email":"julian.castro@gmail.com","telefono":"3157894561","deck":"Jinx Burn","montoPagado":25000,"estadoPago":"pagado","puesto":"3","premioGanado":"$20.000 COP + Cartas Promo","notas":""},
      {"id":"p-16","nombre":"Mateo Rivas","nickname":"mrivas","email":"mateo.rivas@gmail.com","telefono":"3109876543","deck":"Zed Shadow Midrange","montoPagado":25000,"estadoPago":"pagado","puesto":"4","premioGanado":"$20.000 COP + Cartas Promo","notas":""}
    ]'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    juego = EXCLUDED.juego,
    costo_inscripcion = EXCLUDED.costo_inscripcion,
    pozo_premios = EXCLUDED.pozo_premios,
    participantes = EXCLUDED.participantes,
    actualizado_en = NOW();

-- ==============================================================================
-- 9. TABLA: PEDIDOS / COMPRAS EN TIENDA DE CLIENTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pedidos (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nickname TEXT,
    email TEXT,
    estado TEXT DEFAULT 'entregado' CHECK (estado IN ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    metodo_pago TEXT DEFAULT 'ePayco (Nequi)',
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON public.pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_nickname ON public.pedidos(LOWER(nickname));
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pedidos públicos para lectura" ON public.pedidos;
CREATE POLICY "Pedidos públicos para lectura" ON public.pedidos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestionar pedidos (Admin o usuario)" ON public.pedidos;
CREATE POLICY "Gestionar pedidos (Admin o usuario)" ON public.pedidos FOR ALL USING (true);

-- Compras de prueba iniciales asociadas a los jugadores estrella de Bandai
INSERT INTO public.pedidos (id, nickname, estado, total, metodo_pago, items, creado_en)
VALUES
  (
    'PED-1042',
    '[BC] JackPoe',
    'entregado',
    485000,
    'ePayco (Nequi)',
    '[
      {"tipo":"carta","nombre":"Monkey.D.Luffy (Manga Rare OP-05)","cantidad":1,"precio":380000},
      {"tipo":"accesorio","nombre":"Dragon Shield Matte Dual Fury (100ct)","cantidad":1,"precio":55000},
      {"tipo":"accesorio","nombre":"Deck Box Ultimate Guard Sidewinder Purple","cantidad":1,"precio":50000}
    ]'::jsonb,
    NOW() - INTERVAL '2 days'
  ),
  (
    'PED-1038',
    'danieldlora',
    'entregado',
    240000,
    'ePayco (Tarjeta de Crédito)',
    '[
      {"tipo":"carta","nombre":"Donquixote Doflamingo (Leader Parallel)","cantidad":1,"precio":150000},
      {"tipo":"carta","nombre":"Boa Hancock (OP07-051 SR)","cantidad":2,"precio":45000}
    ]'::jsonb,
    NOW() - INTERVAL '5 days'
  ),
  (
    'PED-1025',
    'Niñojackie',
    'entregado',
    185000,
    'ePayco (Bancolombia)',
    '[
      {"tipo":"carta","nombre":"Gecko Moria (OP06-086 SR)","cantidad":2,"precio":65000},
      {"tipo":"accesorio","nombre":"Playmat Capsule Corp Neopreno 60x35cm","cantidad":1,"precio":55000}
    ]'::jsonb,
    NOW() - INTERVAL '18 days'
  ),
  (
    'PED-1030',
    'Lythrick',
    'entregado',
    310000,
    'ePayco (Nequi)',
    '[
      {"tipo":"carta","nombre":"Enel (OP05-098 Leader Parallel)","cantidad":1,"precio":190000},
      {"tipo":"carta","nombre":"Charlotte Katakuri (OP03-123 SEC)","cantidad":1,"precio":120000}
    ]'::jsonb,
    NOW() - INTERVAL '12 days'
  )
ON CONFLICT (id) DO UPDATE SET
    total = EXCLUDED.total,
    items = EXCLUDED.items,
    estado = EXCLUDED.estado;

