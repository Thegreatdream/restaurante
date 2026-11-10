# Donde Tato · Pedidos a domicilio

Web de pedidos para el restaurante. El cliente abre el link que le llega por WhatsApp, elige platos, deja sus datos y sigue su pedido en tiempo real. La cocina ve los pedidos en `/cocina` y los marca como despachados; al despachar, el cliente recibe un correo.

## Cómo está armado (en sencillo)

| Pieza | Para qué sirve |
| --- | --- |
| **Next.js** | La web en sí (pantallas y lógica). |
| **Supabase** | La base de datos: menú, pedidos y cuentas del personal. También avisa en tiempo real. |
| **Resend** | Envía el correo "Tu pedido va en camino". |
| **Vercel** | Publica la web en internet. |
| **GitHub** | Guarda el código y su historial. |

## Páginas

- `/` — Bienvenida con Tato y el menú por categorías. Carrito lateral (computador) u hoja inferior (celular).
- `/checkout` — Datos de entrega y forma de pago.
- `/pedido/[id]` — Estado del pedido en vivo: recibido → preparando → en camino.
- `/cocina` — Panel del personal (requiere iniciar sesión).

## Puesta en marcha

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com) (región: São Paulo o la más cercana).
2. Ve a **SQL Editor**, pega todo `supabase/migrations/0001_esquema.sql` y dale **Run**.
3. Luego pega `supabase/seed.sql` y dale **Run** (carga el menú de ejemplo).
4. Crea la cuenta de la cocina: **Authentication → Users → Add user** (correo + contraseña, marca "Auto confirm").
5. Dale permiso de personal: en **SQL Editor** ejecuta
   ```sql
   insert into staff (user_id, name)
   select id, 'Cocina' from auth.users where email = 'correo-de-la-cocina@ejemplo.com';
   ```
6. En **Authentication → Sign In / Providers**, desactiva "Allow new users to sign up" (nadie más puede crear cuentas).

### 2. Claves
Copia `.env.example` como `.env.local` y pega tus claves. Ese archivo nunca se sube a GitHub.

### 3. Correr en tu computador
```bash
npm install
npm run dev
```
Abre http://localhost:3000

## Tato

Las ilustraciones van en `public/tato/`. El componente `<Tato pose="..."/>` (en `src/components/tato.tsx`) ya tiene las 4 poses: `bienvenida`, `libreta`, `cocinando` y `moto`. Por ahora todas usan `libreta.png` con una animación distinta. Cuando lleguen las nuevas:

1. Pide que las exporten como **PNG con fondo transparente**, todas del mismo tamaño de lienzo.
2. Si vienen con fondo blanco: `node scripts/quitar-fondo.mjs original.png public/tato/cocinando.png`
3. En `src/components/tato.tsx` cambia la ruta de esa pose.

## Ajustes del negocio

- Costo de domicilio, pedido mínimo, minutos para pasar a "preparando" y abierto/cerrado: tabla `settings` en Supabase (**Table Editor → settings**).
- Nombre y textos: `src/lib/negocio.ts`.

## Varios restaurantes (Fase 1)

La plataforma sirve a muchos restaurantes con el mismo código. Cada uno tiene su fila en la tabla `restaurants`
(nombre, colores, mascota, horario, contacto, módulos) y solo ve sus datos (seguridad por restaurante en la base de datos).

**Cómo se elige el restaurante:** por la dirección visitada. Si `restaurants.domain` coincide con el dominio
(p. ej. `dondetato.com`), se muestra ese; si no, el de `RESTAURANTE_POR_DEFECTO` (por defecto `donde-tato`).

**Agregar un restaurante nuevo:**
1. En Supabase, inserta una fila en `restaurants` (slug, nombre y dominio).
2. Crea su horario en `opening_hours` y su menú en `categories` / `products` con su `restaurant_id`.
3. Crea la cuenta del administrador (Authentication → Add user) y agrégala en `members` con rol `admin`.
4. En Vercel, agrega su dominio al proyecto (Settings → Domains).
Desde ahí, el administrador cambia todo en **Panel → Ajustes**.

**Roles del panel (`members.role`):** `admin` (todo, incluidos los ajustes), `cocina` (pedidos y despacho), `mesero` (llega con el pedido en mesa).
