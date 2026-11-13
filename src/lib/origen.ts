import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * Huella de la conexión del visitante (no se guarda la dirección IP, solo un resumen irreversible).
 * Sirve únicamente para frenar pedidos y reservas falsos: muchos seguidos desde la misma conexión.
 * Devuelve null si no se pudo saber de dónde viene la visita.
 */
export async function huellaOrigen(restauranteId: string): Promise<string | null> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip") || "";
  if (!ip) return null;
  return createHash("sha256").update(`${restauranteId}:${ip}`).digest("hex").slice(0, 40);
}
