import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase con la service_role key: solo se usa en el backend,
// tiene permisos totales (se salta Row Level Security), por eso nunca debe
// llegar al frontend.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
