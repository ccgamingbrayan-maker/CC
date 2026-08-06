import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { useAuth } from "./AuthContext.jsx";

const CartContext = createContext();
const LS_KEY = "ccg_carrito";

export function useCart() {
  return useContext(CartContext);
}

// ---------- Persistencia local (usuarios sin sesión) ----------
function leerLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function guardarLocal(items) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify(
      items.map(({ tipo, item_id, cantidad }) => ({ tipo, item_id, cantidad }))
    )
  );
}

// ---------- Persistencia en Supabase (usuarios con sesión) ----------
async function leerDB(userId) {
  const { data } = await supabase
    .from("carrito")
    .select("tipo,item_id,cantidad")
    .eq("user_id", userId);
  return data ?? [];
}

// Aplica un delta (+1, -1, o una cantidad al fusionar) a un renglón del carrito.
// Relee el stock del producto y la cantidad actual JUSTO antes de escribir, así
// la cantidad nunca supera el stock aunque el estado de React esté desactualizado
// (clics rápidos, otra pestaña abierta, etc.). La BD es la fuente de verdad.
async function escribirEnDB(userId, tipo, itemId, delta) {
  const tabla = tipo === "carta" ? "cartas" : "accesorios";

  const [{ data: prod }, { data: fila }] = await Promise.all([
    supabase.from(tabla).select("stock").eq("id", itemId).maybeSingle(),
    supabase
      .from("carrito")
      .select("id,cantidad")
      .eq("user_id", userId)
      .eq("tipo", tipo)
      .eq("item_id", itemId)
      .maybeSingle(),
  ]);

  const stock = prod?.stock == null ? null : Number(prod.stock);
  const actual = fila?.cantidad ?? 0;

  let objetivo = actual + delta;
  if (objetivo < 0) objetivo = 0;
  if (stock != null && objetivo > stock) objetivo = stock;
  if (objetivo === actual) return; // ya está en el tope o no hay cambio

  if (objetivo === 0) {
    if (fila) await supabase.from("carrito").delete().eq("id", fila.id);
  } else if (fila) {
    await supabase.from("carrito").update({ cantidad: objetivo }).eq("id", fila.id);
  } else {
    await supabase
      .from("carrito")
      .insert({ user_id: userId, tipo, item_id: itemId, cantidad: objetivo });
  }
}

// ---------- Enriquecer filas con los datos del producto ----------
async function enriquecer(filas) {
  const cartaIds = filas.filter((f) => f.tipo === "carta").map((f) => f.item_id);
  const accIds = filas.filter((f) => f.tipo === "accesorio").map((f) => f.item_id);

  const [cartasRes, accsRes] = await Promise.all([
    cartaIds.length
      ? supabase.from("cartas").select("id,nombre,imagen,precio,stock").in("id", cartaIds)
      : { data: [] },
    accIds.length
      ? supabase.from("accesorios").select("id,nombre,imagen,precio,stock").in("id", accIds)
      : { data: [] },
  ]);

  const mapa = new Map();
  for (const c of cartasRes.data ?? []) mapa.set(`carta-${c.id}`, c);
  for (const a of accsRes.data ?? []) mapa.set(`accesorio-${a.id}`, a);

  return filas
    .map((f) => {
      const p = mapa.get(`${f.tipo}-${f.item_id}`);
      if (!p) return null; // el producto ya no existe en la tienda
      return {
        tipo: f.tipo,
        item_id: f.item_id,
        cantidad: f.cantidad,
        nombre: p.nombre,
        imagen: p.imagen,
        precio: Number(p.precio ?? 0),
        stock: p.stock == null ? null : Number(p.stock),
      };
    })
    .filter(Boolean);
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cargar el carrito al inicio y cada vez que cambia la sesión.
  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargando(true);
      if (user) {
        // Si había un carrito anónimo en este navegador, se fusiona con la cuenta.
        const locales = leerLocal();
        if (locales.length > 0) {
          for (const l of locales) {
            await escribirEnDB(user.id, l.tipo, l.item_id, l.cantidad);
          }
          localStorage.removeItem(LS_KEY);
        }
        const ricos = await enriquecer(await leerDB(user.id));
        if (activo) setItems(ricos);
      } else {
        const ricos = await enriquecer(leerLocal());
        if (activo) setItems(ricos);
      }
      if (activo) setCargando(false);
    }
    cargar();
  }, [user?.id]);

  async function recargar() {
    if (user) setItems(await enriquecer(await leerDB(user.id)));
    else setItems(await enriquecer(leerLocal()));
  }

  // delta puede ser +1, -1, etc. Nunca supera el stock disponible.
  async function cambiarCantidad(tipo, itemId, delta) {
    if (user) {
      // Con sesión: la BD manda de forma ATÓMICA (evita race conditions).
      // La función bloquea la fila del producto, verifica el stock y escribe,
      // todo en una sola operación. Si la función aún no existe en Supabase,
      // caemos al método de releer-antes-de-escribir.
      const { error } = await supabase.rpc("agregar_al_carrito", {
        p_tipo: tipo,
        p_item_id: itemId,
        p_delta: delta,
      });
      if (error) await escribirEnDB(user.id, tipo, itemId, delta);
    } else {
      // Sin sesión: se guarda en localStorage, usando el stock que ya trae el item.
      const actual = items.find((i) => i.tipo === tipo && i.item_id === itemId);
      const cantidadActual = actual?.cantidad ?? 0;
      const stock = actual?.stock ?? null;

      let objetivo = cantidadActual + delta;
      if (stock != null) objetivo = Math.min(objetivo, stock);
      objetivo = Math.max(objetivo, 0);
      if (objetivo === cantidadActual) return; // en el tope o sin cambio

      const local = leerLocal();
      const idx = local.findIndex((i) => i.tipo === tipo && i.item_id === itemId);
      if (idx >= 0) {
        if (objetivo <= 0) local.splice(idx, 1);
        else local[idx].cantidad = objetivo;
      } else if (objetivo > 0) {
        local.push({ tipo, item_id: itemId, cantidad: objetivo });
      }
      guardarLocal(local);
    }
    await recargar();
  }

  // Firma compatible con los botones existentes: onAgregar({ tipo, id })
  const agregar = (item) => cambiarCantidad(item.tipo, item.id, 1);

  async function quitar(tipo, itemId) {
    if (user) {
      await supabase
        .from("carrito")
        .delete()
        .eq("user_id", user.id)
        .eq("tipo", tipo)
        .eq("item_id", itemId);
    } else {
      guardarLocal(
        leerLocal().filter((i) => !(i.tipo === tipo && i.item_id === itemId))
      );
    }
    await recargar();
  }

  async function vaciar() {
    if (user) await supabase.from("carrito").delete().eq("user_id", user.id);
    else localStorage.removeItem(LS_KEY);
    setItems([]);
  }

  const total = items.reduce((s, i) => s + i.cantidad, 0);
  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cargando,
        total,
        subtotal,
        agregar,
        cambiarCantidad,
        quitar,
        vaciar,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
