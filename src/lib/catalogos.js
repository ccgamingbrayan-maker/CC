import { supabase } from "./supabase.js";
import { juegos as juegosEstaticos } from "../data/juegos.js";

// Juegos: lee de Supabase; si la tabla aún no existe o está vacía,
// usa la lista estática como respaldo.
export async function listarJuegos() {
  const { data, error } = await supabase.from("juegos").select("*").order("id");
  if (error || !data || data.length === 0) return juegosEstaticos;
  return data;
}

export async function crearJuego(nombre, imagen = null) {
  const { data, error } = await supabase
    .from("juegos")
    .insert({ nombre: nombre.trim(), imagen })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarExpansiones(juegoId) {
  const { data, error } = await supabase
    .from("expansiones")
    .select("*")
    .eq("juego_id", Number(juegoId))
    .order("nombre");
  if (error) return [];
  return data ?? [];
}

export async function crearExpansion(juegoId, nombre) {
  const { data, error } = await supabase
    .from("expansiones")
    .insert({ juego_id: Number(juegoId), nombre: nombre.trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Crea la expansión si no existe (comparando sin mayúsculas) y devuelve su nombre.
export async function asegurarExpansion(juegoId, nombre) {
  const limpio = nombre?.trim();
  if (!limpio) return null;
  const { data: existente } = await supabase
    .from("expansiones")
    .select("id,nombre")
    .eq("juego_id", Number(juegoId))
    .ilike("nombre", limpio)
    .maybeSingle();
  if (existente) return existente.nombre;
  try {
    const creada = await crearExpansion(juegoId, limpio);
    return creada.nombre;
  } catch (e) {
    console.error("No se pudo registrar la expansión:", e);
    return limpio; // aunque falle la tabla, la carta igual guarda el texto
  }
}
