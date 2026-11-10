import "server-only";
import { cache } from "react";
import { supabaseServidor } from "@/lib/supabase/server";
import { obtenerAjustes } from "@/lib/menu";
import type { RolMiembro } from "@/lib/tipos";

/**
 * Rol del usuario que inició sesión en el restaurante que se está visitando.
 * null si no tiene sesión o no pertenece a este restaurante.
 */
export const miRol = cache(async (): Promise<RolMiembro | null> => {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const restaurante = await obtenerAjustes();
  const { data } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurante.id)
    .maybeSingle();
  return (data?.role as RolMiembro) ?? null;
});
