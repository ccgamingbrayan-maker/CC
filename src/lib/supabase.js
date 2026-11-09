import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn("Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env");
}

export const supabase = createClient(url, publishableKey);


