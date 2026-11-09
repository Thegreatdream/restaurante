"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { NEGOCIO } from "@/lib/negocio";

export default function Ingresar() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (error) {
      setError("Correo o contraseña incorrectos.");
      setCargando(false);
      return;
    }
    router.replace("/cocina");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-[1.75rem] bg-surface p-6 sticker">
        <p className="text-sm font-bold text-ink-soft">{NEGOCIO.nombre}</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Cocina</h1>
        <p className="mt-1 text-sm text-ink-soft">Solo para el personal del restaurante.</p>

        <label htmlFor="correo" className="mt-6 mb-1.5 block text-[15px] font-bold">
          Correo
        </label>
        <input
          id="correo"
          className="campo"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />
        <label htmlFor="clave" className="mt-4 mb-1.5 block text-[15px] font-bold">
          Contraseña
        </label>
        <input
          id="clave"
          className="campo"
          type="password"
          autoComplete="current-password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="mt-3 text-sm font-semibold text-coral-ink">
            {error}
          </p>
        )}
        <button type="submit" className="btn mt-6 w-full" disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
