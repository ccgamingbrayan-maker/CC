import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase.js";

// Correo autorizado como administrador. Se puede sobreescribir con VITE_ADMIN_EMAIL.
const ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || "ccgamingbrayan@gmail.com"
).toLowerCase();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Sesión inicial (si ya había login guardado)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });

    // Escuchar cambios (login / logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const esAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL;

  const value = {
    session,
    user,
    esAdmin,
    cargando,
    login(email, password) {
      return supabase.auth.signInWithPassword({ email, password });
    },
    logout() {
      return supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
