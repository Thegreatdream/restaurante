-- =====================================================================
-- Esquema de la web de pedidos a domicilio
-- Se pega completo en Supabase → SQL Editor → Run.
-- =====================================================================

create extension if not exists pg_cron;

-- ---------- Tipos ----------
create type order_status   as enum ('recibido', 'preparando', 'en_camino', 'cancelado');
create type payment_method as enum ('efectivo', 'transferencia');
create type payment_status as enum ('pendiente', 'pagado');

-- ---------- Ajustes del negocio (una sola fila) ----------
create table settings (
  id                    boolean primary key default true check (id),
  delivery_fee          int  not null default 4000 check (delivery_fee >= 0),
  min_order             int  not null default 0    check (min_order >= 0),
  prep_delay_minutes    int  not null default 2    check (prep_delay_minutes between 0 and 60),
  is_open               boolean not null default true
);
insert into settings default values;

-- ---------- Menú ----------
create table categories (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  slug      text not null unique,
  position  int  not null default 0,
  is_active boolean not null default true
);

create table products (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories on delete cascade,
  name         text not null,
  description  text,
  price        int  not null check (price > 0),          -- pesos colombianos enteros
  badge        text,                                     -- p. ej. "Favorito de Tato"
  is_available boolean not null default true,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);
create index on products (category_id, position);

-- ---------- Personal del restaurante ----------
create table staff (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text,
  created_at timestamptz not null default now()
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

-- ---------- Pedidos ----------
create table orders (
  id               uuid primary key default gen_random_uuid(),
  daily_number     int  not null,                         -- #1, #2… se reinicia cada día
  customer_name    text not null check (char_length(customer_name) between 2 and 80),
  customer_phone   text not null check (customer_phone ~ '^3[0-9]{9}$'),
  customer_email   text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address          text not null check (char_length(address) between 5 and 200),
  address_notes    text check (char_length(address_notes) <= 300),
  payment_method   payment_method not null,
  cash_change_for  int check (cash_change_for > 0),       -- "pago con…" (efectivo)
  payment_status   payment_status not null default 'pendiente',
  status           order_status   not null default 'recibido',
  subtotal         int not null,
  delivery_fee     int not null,
  total            int not null,
  created_at       timestamptz not null default now(),
  preparing_at     timestamptz,
  dispatched_at    timestamptz,
  email_sent_at    timestamptz
);
create index on orders (created_at desc);
create index on orders (status);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders on delete cascade,
  product_id   uuid references products on delete set null,
  product_name text not null,                             -- copia al momento de pedir
  unit_price   int  not null,                             -- copia al momento de pedir
  quantity     int  not null check (quantity between 1 and 50),
  line_total   int  not null
);
create index on order_items (order_id);

-- =====================================================================
-- Seguridad (RLS)
-- =====================================================================
alter table settings    enable row level security;
alter table categories  enable row level security;
alter table products    enable row level security;
alter table staff       enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

-- Público: solo lee el menú y los ajustes.
create policy "menu publico"      on categories for select using (is_active or is_staff());
create policy "productos publico" on products   for select using (is_available or is_staff());
create policy "ajustes publico"   on settings   for select using (true);

-- Staff: gestiona menú y ajustes.
create policy "staff categorias" on categories for all using (is_staff()) with check (is_staff());
create policy "staff productos"  on products   for all using (is_staff()) with check (is_staff());
create policy "staff ajustes"    on settings   for update using (is_staff()) with check (is_staff());
create policy "staff se ve"      on staff      for select using (user_id = auth.uid());

-- Pedidos: solo staff los lee y actualiza. El público NO lee la tabla:
-- crea pedidos con create_order() y ve el suyo con get_order(id).
create policy "staff lee pedidos"      on orders      for select using (is_staff());
create policy "staff actualiza pedido" on orders      for update using (is_staff()) with check (is_staff());
create policy "staff lee items"        on order_items for select using (is_staff());

-- =====================================================================
-- Crear pedido: el precio SIEMPRE se calcula aquí, en el servidor.
-- p_items = [{"product_id": "...", "quantity": 2}, ...]
-- =====================================================================
create or replace function create_order(
  p_name text, p_phone text, p_email text, p_address text, p_address_notes text,
  p_payment_method payment_method, p_cash_change_for int, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_settings  settings;
  v_order_id  uuid;
  v_subtotal  int := 0;
  v_number    int;
  v_item      jsonb;
  v_product   products;
  v_qty       int;
  v_today     date := (now() at time zone 'America/Bogota')::date;
begin
  select * into v_settings from settings limit 1;
  if not v_settings.is_open then
    raise exception 'CERRADO' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CARRITO_VACIO' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'DEMASIADOS_ITEMS' using errcode = 'P0001';
  end if;

  -- Número del día (bloqueo para que dos pedidos simultáneos no tomen el mismo)
  perform pg_advisory_xact_lock(hashtext('daily_number'));
  select coalesce(max(daily_number), 0) + 1 into v_number
    from orders where (created_at at time zone 'America/Bogota')::date = v_today;

  insert into orders (daily_number, customer_name, customer_phone, customer_email, address,
                      address_notes, payment_method, cash_change_for, subtotal, delivery_fee, total)
  values (v_number, trim(p_name), p_phone, lower(trim(p_email)), trim(p_address),
          nullif(trim(p_address_notes), ''), p_payment_method,
          case when p_payment_method = 'efectivo' then p_cash_change_for end,
          0, v_settings.delivery_fee, 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and is_available;
    if not found then
      raise exception 'PRODUCTO_NO_DISPONIBLE' using errcode = 'P0001';
    end if;
    insert into order_items (order_id, product_id, product_name, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  if v_subtotal < v_settings.min_order then
    raise exception 'PEDIDO_MINIMO' using errcode = 'P0001';
  end if;

  update orders set subtotal = v_subtotal, total = v_subtotal + delivery_fee
   where id = v_order_id;

  return v_order_id;
end $$;

-- =====================================================================
-- Ver un pedido por su id (lo único que el cliente puede leer).
-- No devuelve correo ni celular.
-- =====================================================================
create or replace function get_order(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id,
    'number', o.daily_number,
    'status', o.status,
    'first_name', split_part(o.customer_name, ' ', 1),
    'address', o.address,
    'payment_method', o.payment_method,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'created_at', o.created_at,
    'preparing_at', o.preparing_at,
    'dispatched_at', o.dispatched_at,
    'prep_delay_minutes', (select prep_delay_minutes from settings limit 1),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity,
                                          'line_total', i.line_total) order by i.product_name)
        from order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from orders o where o.id = p_id;
$$;

revoke all on function create_order from public;
revoke all on function get_order    from public;
grant execute on function create_order to anon, authenticated;
grant execute on function get_order    to anon, authenticated;

-- =====================================================================
-- Paso automático "recibido" → "preparando"
-- =====================================================================
create or replace function advance_received_orders() returns void
language sql security definer set search_path = public as $$
  update orders
     set status = 'preparando', preparing_at = now()
   where status = 'recibido'
     and created_at <= now() - make_interval(mins => (select prep_delay_minutes from settings limit 1));
$$;

select cron.schedule('avanzar-pedidos', '30 seconds', 'select public.advance_received_orders()');

-- Al despachar, guardar la hora automáticamente
create or replace function stamp_dispatch() returns trigger
language plpgsql as $$
begin
  if new.status = 'en_camino' and old.status is distinct from 'en_camino' then
    new.dispatched_at := coalesce(new.dispatched_at, now());
  end if;
  return new;
end $$;
create trigger orders_stamp_dispatch before update on orders
  for each row execute function stamp_dispatch();

-- =====================================================================
-- Tiempo real
-- Cliente: canal "pedido:<id>" (solo quien conoce el id lo puede escuchar).
-- Cocina: escucha cambios de la tabla orders (RLS limita a staff).
-- =====================================================================
create or replace function broadcast_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform realtime.send(
      jsonb_build_object('status', new.status, 'preparing_at', new.preparing_at,
                         'dispatched_at', new.dispatched_at),
      'estado', 'pedido:' || new.id::text, false);
  end if;
  return new;
end $$;
create trigger orders_broadcast after update on orders
  for each row execute function broadcast_order_status();

alter publication supabase_realtime add table orders;
