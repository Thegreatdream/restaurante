-- =====================================================================
-- Fase 3: pedido en mesa por QR.
-- Mesas con QR fijo, cuentas abiertas por mesa (varias personas piden a la misma),
-- confirmación del mesero contra pedidos falsos, avisos (llamar mesero / pedir la cuenta)
-- y cierre de cuenta. Se pega completo en el SQL Editor (después de 0005).
-- =====================================================================

alter type order_status add value if not exists 'por_confirmar';

-- ---------- Mesas (el QR impreso lleva el token, que no cambia) ----------
create table restaurant_tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  label         text not null check (char_length(label) between 1 and 20),
  token         text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active        boolean not null default true,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  unique (restaurant_id, label)
);
create index on restaurant_tables (restaurant_id, position);

-- ---------- Cuenta de mesa: se abre con el primer escaneo y se cierra al cobrar ----------
-- El código de acceso cambia con cada cuenta: al cerrarla, los celulares de la cuenta anterior ya no pueden pedir.
create table table_sessions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  table_id      uuid not null references restaurant_tables on delete cascade,
  access_code   text not null default replace(gen_random_uuid()::text, '-', ''),
  status        text not null default 'abierta' check (status in ('abierta', 'cerrada')),
  confirmed_at  timestamptz,                  -- el mesero confirmó que la mesa está ocupada
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  total         int
);
create unique index una_cuenta_abierta_por_mesa on table_sessions (table_id) where status = 'abierta';
create index on table_sessions (restaurant_id, status);

-- ---------- Avisos de la mesa ----------
create table service_calls (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  session_id    uuid not null references table_sessions on delete cascade,
  kind          text not null check (kind in ('mesero', 'cuenta')),
  status        text not null default 'pendiente' check (status in ('pendiente', 'atendido')),
  created_at    timestamptz not null default now(),
  attended_at   timestamptz
);
create index on service_calls (restaurant_id, status);

-- ---------- Pedidos de mesa: sin celular, correo ni forma de pago (se cobra al cerrar la cuenta) ----------
alter table orders
  add column if not exists table_session_id uuid references table_sessions on delete set null,
  add column if not exists table_label      text;
alter table orders alter column customer_phone drop not null;
alter table orders alter column customer_email drop not null;
alter table orders alter column payment_method drop not null;
alter table orders add constraint datos_segun_tipo check (
  order_type = 'mesa'
  or (customer_phone is not null and customer_email is not null and payment_method is not null));
create index on orders (table_session_id);

-- ---------- Seguridad ----------
alter table restaurant_tables enable row level security;
alter table table_sessions    enable row level security;
alter table service_calls     enable row level security;

create policy "equipo ve mesas"   on restaurant_tables for select using (is_member(restaurant_id));
create policy "admin mesas"       on restaurant_tables for all
  using (is_member(restaurant_id, '{admin}')) with check (is_member(restaurant_id, '{admin}'));
create policy "equipo ve cuentas" on table_sessions for select using (is_member(restaurant_id));
create policy "equipo ve avisos"  on service_calls for select using (is_member(restaurant_id));
create policy "mesero atiende"    on service_calls for update
  using (is_member(restaurant_id, '{admin,mesero}')) with check (is_member(restaurant_id, '{admin,mesero}'));

-- El mesero también actualiza pedidos (entregado en la mesa)
drop policy if exists "cocina actualiza" on orders;
create policy "equipo actualiza" on orders for update
  using (is_member(restaurant_id, '{admin,cocina,mesero}')) with check (is_member(restaurant_id, '{admin,cocina,mesero}'));

alter publication supabase_realtime add table service_calls;
alter publication supabase_realtime add table table_sessions;

-- =====================================================================
-- Funciones para el cliente (sin cuenta): todo pasa por el token del QR o el código de la cuenta
-- =====================================================================

-- Abre (o se une a) la cuenta abierta de la mesa del QR
create or replace function open_table_session(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_t restaurant_tables; v_r restaurants; v_s table_sessions;
begin
  select * into v_t from restaurant_tables where token = p_token and active;
  if not found then raise exception 'MESA_NO_EXISTE' using errcode = 'P0001'; end if;
  select * into v_r from restaurants where id = v_t.restaurant_id;
  if not v_r.mod_table then raise exception 'MODULO_INACTIVO' using errcode = 'P0001'; end if;

  select * into v_s from table_sessions where table_id = v_t.id and status = 'abierta';
  if not found then
    begin
      insert into table_sessions (restaurant_id, table_id) values (v_t.restaurant_id, v_t.id) returning * into v_s;
    exception when unique_violation then
      -- Dos personas escanearon a la vez: se usa la cuenta que alcanzó a abrirse
      select * into v_s from table_sessions where table_id = v_t.id and status = 'abierta';
    end;
  end if;

  return jsonb_build_object('session_id', v_s.id, 'access_code', v_s.access_code, 'table_id', v_t.id,
    'table_label', v_t.label, 'restaurant_id', v_t.restaurant_id, 'confirmed', v_s.confirmed_at is not null);
end $$;
grant execute on function open_table_session(text) to anon, authenticated;

-- Lo que ve el cliente de su cuenta: estado, pedidos y total
create or replace function table_session_view(p_session uuid, p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', s.status, 'confirmed', s.confirmed_at is not null, 'table_label', t.label,
    'total', coalesce((select sum(o.total) from orders o
                        where o.table_session_id = s.id and o.status::text <> 'cancelado'), 0),
    'calls', coalesce((select jsonb_agg(c.kind) from service_calls c
                        where c.session_id = s.id and c.status = 'pendiente'), '[]'::jsonb),
    'orders', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', o.id, 'number', o.daily_number, 'status', o.status,
                  'name', split_part(o.customer_name, ' ', 1), 'total', o.total,
                  'items', (select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity))
                              from order_items i where i.order_id = o.id))
                  order by o.created_at)
                from orders o where o.table_session_id = s.id), '[]'::jsonb))
  from table_sessions s join restaurant_tables t on t.id = s.table_id
  where s.id = p_session and s.access_code = p_code;
$$;
grant execute on function table_session_view(uuid, text) to anon, authenticated;

-- "Llamar al mesero" o "Pedir la cuenta" (un aviso pendiente de cada tipo a la vez)
create or replace function call_waiter(p_session uuid, p_code text, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
declare v_s table_sessions;
begin
  if p_kind not in ('mesero', 'cuenta') then raise exception 'AVISO_INVALIDO' using errcode = 'P0001'; end if;
  select * into v_s from table_sessions where id = p_session and access_code = p_code and status = 'abierta';
  if not found then raise exception 'CUENTA_CERRADA' using errcode = 'P0001'; end if;
  if not exists (select 1 from service_calls where session_id = v_s.id and kind = p_kind and status = 'pendiente') then
    insert into service_calls (restaurant_id, session_id, kind) values (v_s.restaurant_id, v_s.id, p_kind);
  end if;
end $$;
grant execute on function call_waiter(uuid, text, text) to anon, authenticated;

-- ---------- Crear pedido: ahora también en mesa ----------
drop function if exists create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz);

create or replace function create_order(
  p_restaurant uuid, p_type order_type,
  p_name text, p_phone text, p_email text, p_address text, p_address_notes text,
  p_payment_method payment_method, p_cash_change_for int, p_items jsonb, p_consent boolean,
  p_pickup_at timestamptz default null,
  p_table_session uuid default null, p_access_code text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_r restaurants; v_order_id uuid; v_subtotal int := 0; v_number int;
  v_item jsonb; v_product products; v_qty int; v_today date; v_fee int; v_local timestamp;
  v_s table_sessions; v_label text; v_status order_status := 'recibido';
begin
  select * into v_r from restaurants where id = p_restaurant;
  if not found then raise exception 'RESTAURANTE_NO_EXISTE' using errcode = 'P0001'; end if;

  if (p_type = 'domicilio' and not v_r.mod_delivery)
     or (p_type = 'recoger' and not v_r.mod_pickup)
     or (p_type = 'mesa' and not v_r.mod_table) then
    raise exception 'MODULO_INACTIVO' using errcode = 'P0001';
  end if;

  v_today := (now() at time zone v_r.timezone)::date;
  if not coalesce((opening_status(p_restaurant)->>'open')::boolean, false) then
    raise exception 'CERRADO' using errcode = 'P0001';
  end if;
  if p_consent is not true then raise exception 'SIN_AUTORIZACION' using errcode = 'P0001'; end if;

  v_fee := 0;
  if p_type = 'domicilio' then
    if p_address is null or char_length(trim(p_address)) < 5 then
      raise exception 'SIN_DIRECCION' using errcode = 'P0001';
    end if;
    v_fee := v_r.delivery_fee;
  end if;

  if p_type = 'recoger' then
    if p_pickup_at is null then raise exception 'SIN_HORA' using errcode = 'P0001'; end if;
    v_local := p_pickup_at at time zone v_r.timezone;
    if v_local::date <> v_today
       or p_pickup_at < now() + make_interval(mins => v_r.pickup_lead_minutes - 2)
       or not exists (select 1 from opening_hours
                       where restaurant_id = p_restaurant and weekday = extract(dow from v_local)::int
                         and v_local::time >= opens and v_local::time <= closes) then
      raise exception 'HORA_INVALIDA' using errcode = 'P0001';
    end if;
  end if;

  if p_type = 'mesa' then
    select * into v_s from table_sessions
     where id = p_table_session and access_code = p_access_code and restaurant_id = p_restaurant and status = 'abierta';
    if not found then raise exception 'CUENTA_CERRADA' using errcode = 'P0001'; end if;
    select label into v_label from restaurant_tables where id = v_s.table_id;
    -- Mientras el mesero no confirme que la mesa está ocupada, el pedido espera
    if v_s.confirmed_at is null then v_status := 'por_confirmar'; end if;
  else
    if p_phone is null or p_email is null or p_payment_method is null then
      raise exception 'DATOS_INCOMPLETOS' using errcode = 'P0001';
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CARRITO_VACIO' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 40 then raise exception 'DEMASIADOS_ITEMS' using errcode = 'P0001'; end if;

  perform pg_advisory_xact_lock(hashtext('daily_number:' || p_restaurant::text));
  select coalesce(max(daily_number), 0) + 1 into v_number from orders
   where restaurant_id = p_restaurant and (created_at at time zone v_r.timezone)::date = v_today;

  insert into orders (restaurant_id, order_type, status, daily_number, customer_name, customer_phone, customer_email,
                      address, address_notes, pickup_at, payment_method, cash_change_for,
                      table_session_id, table_label,
                      subtotal, delivery_fee, total, data_consent_at, privacy_version, is_demo)
  values (p_restaurant, p_type, v_status, v_number, trim(p_name),
          case when p_type = 'mesa' then null else p_phone end,
          case when p_type = 'mesa' then null else lower(trim(p_email)) end,
          case when p_type = 'domicilio' then trim(p_address) end,
          case when p_type = 'domicilio' then nullif(trim(p_address_notes), '') end,
          case when p_type = 'recoger' then p_pickup_at end,
          case when p_type = 'mesa' then null else p_payment_method end,
          case when p_type <> 'mesa' and p_payment_method = 'efectivo' then p_cash_change_for end,
          case when p_type = 'mesa' then v_s.id end, v_label,
          0, v_fee, 0, now(), v_r.privacy_version, v_r.demo_mode)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product from products
     where id = (v_item->>'product_id')::uuid and restaurant_id = p_restaurant and is_available;
    if not found then raise exception 'PRODUCTO_NO_DISPONIBLE' using errcode = 'P0001'; end if;
    insert into order_items (restaurant_id, order_id, product_id, product_name, unit_price, quantity, line_total)
    values (p_restaurant, v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  if p_type <> 'mesa' and v_subtotal < v_r.min_order then raise exception 'PEDIDO_MINIMO' using errcode = 'P0001'; end if;
  update orders set subtotal = v_subtotal, total = v_subtotal + delivery_fee where id = v_order_id;
  return v_order_id;
end $$;

revoke all on function create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz, uuid, text) from public;
grant execute on function create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz, uuid, text) to anon, authenticated;

-- =====================================================================
-- Funciones para meseros (y administrador)
-- =====================================================================

-- Confirmar que la mesa está ocupada: sus pedidos pendientes pasan a la cocina
create or replace function confirm_table_session(p_session uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_s table_sessions;
begin
  select * into v_s from table_sessions where id = p_session and status = 'abierta';
  if not found then raise exception 'CUENTA_CERRADA' using errcode = 'P0001'; end if;
  if not is_member(v_s.restaurant_id, '{admin,mesero}') then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  update table_sessions set confirmed_at = coalesce(confirmed_at, now()) where id = p_session;
  update orders set status = 'recibido', created_at = now()
   where table_session_id = p_session and status::text = 'por_confirmar';
end $$;
grant execute on function confirm_table_session(uuid) to authenticated;

-- Cerrar la cuenta al cobrar: guarda el total, cancela lo que nunca se confirmó y renueva el código
create or replace function close_table_session(p_session uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_s table_sessions; v_total int;
begin
  select * into v_s from table_sessions where id = p_session and status = 'abierta';
  if not found then raise exception 'CUENTA_CERRADA' using errcode = 'P0001'; end if;
  if not is_member(v_s.restaurant_id, '{admin,mesero}') then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  update orders set status = 'cancelado' where table_session_id = p_session and status::text = 'por_confirmar';
  select coalesce(sum(total), 0) into v_total from orders
   where table_session_id = p_session and status::text <> 'cancelado';
  update table_sessions set status = 'cerrada', closed_at = now(), total = v_total,
         access_code = replace(gen_random_uuid()::text, '-', '')
   where id = p_session;
  update service_calls set status = 'atendido', attended_at = now()
   where session_id = p_session and status = 'pendiente';
  return v_total;
end $$;
grant execute on function close_table_session(uuid) to authenticated;

-- Pedido creado por el mesero para quien no quiere usar el celular
create or replace function staff_table_order(p_table uuid, p_items jsonb, p_name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_t restaurant_tables; v_r restaurants; v_s table_sessions; v_order_id uuid; v_subtotal int := 0;
  v_number int; v_item jsonb; v_product products; v_qty int; v_today date;
begin
  select * into v_t from restaurant_tables where id = p_table and active;
  if not found then raise exception 'MESA_NO_EXISTE' using errcode = 'P0001'; end if;
  if not is_member(v_t.restaurant_id, '{admin,mesero}') then raise exception 'NO_AUTORIZADO' using errcode = '42501'; end if;
  select * into v_r from restaurants where id = v_t.restaurant_id;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CARRITO_VACIO' using errcode = 'P0001';
  end if;

  -- Usa la cuenta abierta de la mesa o abre una ya confirmada (el mesero está ahí)
  select * into v_s from table_sessions where table_id = v_t.id and status = 'abierta';
  if not found then
    insert into table_sessions (restaurant_id, table_id, confirmed_at) values (v_t.restaurant_id, v_t.id, now())
    returning * into v_s;
  elsif v_s.confirmed_at is null then
    perform confirm_table_session(v_s.id);
  end if;

  v_today := (now() at time zone v_r.timezone)::date;
  perform pg_advisory_xact_lock(hashtext('daily_number:' || v_t.restaurant_id::text));
  select coalesce(max(daily_number), 0) + 1 into v_number from orders
   where restaurant_id = v_t.restaurant_id and (created_at at time zone v_r.timezone)::date = v_today;

  insert into orders (restaurant_id, order_type, status, daily_number, customer_name, table_session_id, table_label,
                      subtotal, delivery_fee, total, is_demo)
  values (v_t.restaurant_id, 'mesa', 'recibido', v_number, coalesce(nullif(trim(p_name), ''), 'Mesa ' || v_t.label),
          v_s.id, v_t.label, 0, 0, 0, v_r.demo_mode)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_product from products
     where id = (v_item->>'product_id')::uuid and restaurant_id = v_t.restaurant_id and is_available;
    if not found then raise exception 'PRODUCTO_NO_DISPONIBLE' using errcode = 'P0001'; end if;
    insert into order_items (restaurant_id, order_id, product_id, product_name, unit_price, quantity, line_total)
    values (v_t.restaurant_id, v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_product.price * v_qty);
    v_subtotal := v_subtotal + v_product.price * v_qty;
  end loop;

  update orders set subtotal = v_subtotal, total = v_subtotal where id = v_order_id;
  return v_order_id;
end $$;
grant execute on function staff_table_order(uuid, jsonb, text) to authenticated;

-- La vista pública del pedido incluye la mesa
create or replace function get_order(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.daily_number, 'status', o.status, 'type', o.order_type,
    'first_name', split_part(o.customer_name, ' ', 1), 'address', o.address,
    'payment_method', o.payment_method, 'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'created_at', o.created_at, 'preparing_at', o.preparing_at,
    'dispatched_at', o.dispatched_at, 'ready_at', o.ready_at, 'delivered_at', o.delivered_at,
    'pickup_at', o.pickup_at, 'table_label', o.table_label, 'prep_delay_minutes', r.prep_delay_minutes,
    'restaurant_id', o.restaurant_id,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity,
                                          'line_total', i.line_total) order by i.product_name)
        from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o join restaurants r on r.id = o.restaurant_id
  where o.id = p_id;
$$;

-- Tres mesas de ejemplo para Donde Tato
insert into restaurant_tables (restaurant_id, label, position)
select r.id, n::text, n from restaurants r cross join generate_series(1, 3) n
where r.slug = 'donde-tato' on conflict do nothing;

select (select count(*) from restaurant_tables) as mesas, 'ok' as fase3;
