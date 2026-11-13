-- =====================================================================
-- Fase 7: notas del pedido, correo opcional, datos para transferir y freno a pedidos falsos.
--
--  · orders.notes: "sin cebolla", "con sopa"… la cocina lo ve en el panel.
--  · El correo del cliente ya no es obligatorio (sin correo, no se envía aviso).
--  · restaurants.transfer_info: texto libre con los datos para transferir (Nequi, cuenta…).
--  · Límite de pedidos y reservas por celular (y por conexión) para frenar pedidos falsos.
--
-- Se pega completo en Supabase → SQL Editor → Run (después de 0009).
-- Se puede correr más de una vez sin problema.
-- =====================================================================

-- ---------- Columnas nuevas ----------
alter table orders
  add column if not exists notes       text check (char_length(notes) <= 300),
  add column if not exists origin_hash text;   -- huella de la conexión (no es la IP): solo para el límite

alter table reservations
  add column if not exists origin_hash text;

alter table restaurants
  add column if not exists transfer_info text check (char_length(transfer_info) <= 300);

create index if not exists orders_celular_reciente on orders (restaurant_id, customer_phone, created_at desc);
create index if not exists orders_origen_reciente  on orders (restaurant_id, origin_hash, created_at desc);
create index if not exists reservas_celular        on reservations (restaurant_id, phone, slot_start);

-- ---------- El correo deja de ser obligatorio (celular y forma de pago siguen siéndolo) ----------
alter table orders drop constraint if exists datos_segun_tipo;
alter table orders add constraint datos_segun_tipo check (
  order_type = 'mesa'
  or (customer_phone is not null and payment_method is not null));

-- =====================================================================
-- Crear pedido: con notas, correo opcional y límites
-- =====================================================================
drop function if exists create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz, uuid, text);
drop function if exists create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz, uuid, text, text, text);

create or replace function create_order(
  p_restaurant uuid, p_type order_type,
  p_name text, p_phone text, p_email text, p_address text, p_address_notes text,
  p_payment_method payment_method, p_cash_change_for int, p_items jsonb, p_consent boolean,
  p_pickup_at timestamptz default null,
  p_table_session uuid default null, p_access_code text default null,
  p_notes text default null, p_origin text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_r restaurants; v_order_id uuid; v_subtotal int := 0; v_number int;
  v_item jsonb; v_product products; v_qty int; v_today date; v_fee int; v_local timestamp;
  v_s table_sessions; v_label text; v_status order_status := 'recibido';
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_notes text := nullif(left(trim(coalesce(p_notes, '')), 300), '');
  v_origin text := nullif(left(coalesce(p_origin, ''), 64), '');
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
    if v_s.confirmed_at is null then
      v_status := 'por_confirmar';
      -- Freno: una mesa sin confirmar no puede acumular pedidos sin fin
      if (select count(*) from orders where table_session_id = v_s.id and status::text = 'por_confirmar') >= 6 then
        raise exception 'DEMASIADOS_PEDIDOS' using errcode = 'P0001';
      end if;
    end if;
  else
    if p_phone is null or p_payment_method is null then
      raise exception 'DATOS_INCOMPLETOS' using errcode = 'P0001';
    end if;
    -- Freno a pedidos falsos: máximo 3 pedidos por celular cada 30 minutos…
    if (select count(*) from orders
         where restaurant_id = p_restaurant and customer_phone = p_phone
           and created_at > now() - interval '30 minutes' and status::text <> 'cancelado') >= 3 then
      raise exception 'DEMASIADOS_PEDIDOS' using errcode = 'P0001';
    end if;
    -- …y máximo 12 desde la misma conexión (una oficina comparte conexión: por eso es más alto)
    if v_origin is not null and (select count(*) from orders
         where restaurant_id = p_restaurant and origin_hash = v_origin
           and created_at > now() - interval '30 minutes') >= 12 then
      raise exception 'DEMASIADOS_PEDIDOS' using errcode = 'P0001';
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
                      table_session_id, table_label, notes, origin_hash,
                      subtotal, delivery_fee, total, data_consent_at, privacy_version, is_demo)
  values (p_restaurant, p_type, v_status, v_number, trim(p_name),
          case when p_type = 'mesa' then null else p_phone end,
          case when p_type = 'mesa' then null else v_email end,
          case when p_type = 'domicilio' then trim(p_address) end,
          case when p_type = 'domicilio' then nullif(trim(p_address_notes), '') end,
          case when p_type = 'recoger' then p_pickup_at end,
          case when p_type = 'mesa' then null else p_payment_method end,
          case when p_type <> 'mesa' and p_payment_method = 'efectivo' then p_cash_change_for end,
          case when p_type = 'mesa' then v_s.id end, v_label, v_notes, v_origin,
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

revoke all on function create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz, uuid, text, text, text) from public;
grant execute on function create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz, uuid, text, text, text) to anon, authenticated;

-- =====================================================================
-- Lo que ve el cliente de su pedido: ahora con sus notas y si dejó correo
-- =====================================================================
create or replace function get_order(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.daily_number, 'status', o.status, 'type', o.order_type,
    'first_name', split_part(o.customer_name, ' ', 1), 'address', o.address,
    'payment_method', o.payment_method, 'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'created_at', o.created_at, 'preparing_at', o.preparing_at,
    'dispatched_at', o.dispatched_at, 'ready_at', o.ready_at, 'delivered_at', o.delivered_at,
    'pickup_at', o.pickup_at, 'table_label', o.table_label, 'prep_delay_minutes', r.prep_delay_minutes,
    'restaurant_id', o.restaurant_id, 'notes', o.notes, 'has_email', o.customer_email is not null,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity,
                                          'line_total', i.line_total) order by i.product_name)
        from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o join restaurants r on r.id = o.restaurant_id
  where o.id = p_id;
$$;

-- =====================================================================
-- Link privado de la entrega: con las notas y los datos para transferir
-- =====================================================================
create or replace function get_delivery(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.daily_number, 'status', o.status,
    'customer_name', o.customer_name, 'customer_phone', o.customer_phone,
    'address', o.address, 'address_notes', o.address_notes, 'notes', o.notes,
    'payment_method', o.payment_method, 'payment_status', o.payment_status,
    'cash_change_for', o.cash_change_for, 'total', o.total, 'delivery_fee', o.delivery_fee,
    'courier_name', c.name, 'restaurant_name', r.name, 'restaurant_phone', r.phone,
    'transfer_info', r.transfer_info,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity)
                                         order by i.product_name)
                         from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o
  join restaurants r on r.id = o.restaurant_id
  left join couriers c on c.id = o.courier_id
  where o.delivery_token = p_token;
$$;

-- =====================================================================
-- Crear reserva: con límite por celular y por conexión
-- =====================================================================
drop function if exists create_reservation(uuid, timestamptz, int, text, text, text, text, boolean);
drop function if exists create_reservation(uuid, timestamptz, int, text, text, text, text, boolean, text);

create or replace function create_reservation(
  p_restaurant uuid, p_start timestamptz, p_party int,
  p_name text, p_phone text, p_email text, p_note text, p_consent boolean,
  p_origin text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_r restaurants; v_local timestamp; v_ocupado int; v_res reservations; v_valida boolean;
  v_origin text := nullif(left(coalesce(p_origin, ''), 64), '');
begin
  select * into v_r from restaurants where id = p_restaurant;
  if not found then raise exception 'RESTAURANTE_NO_EXISTE' using errcode = 'P0001'; end if;
  if not v_r.mod_reservations then raise exception 'MODULO_INACTIVO' using errcode = 'P0001'; end if;
  if p_consent is not true then raise exception 'SIN_AUTORIZACION' using errcode = 'P0001'; end if;
  if p_party < 1 or p_party > v_r.reservation_max_party then raise exception 'PERSONAS_INVALIDAS' using errcode = 'P0001'; end if;

  v_local := p_start at time zone v_r.timezone;
  if p_start < now() + make_interval(mins => v_r.reservation_lead_minutes)
     or v_local::date > (now() at time zone v_r.timezone)::date + v_r.reservation_days_ahead then
    raise exception 'FRANJA_INVALIDA' using errcode = 'P0001';
  end if;

  -- La hora debe ser el inicio de una franja dentro del horario de reservas
  select exists (
    select 1 from reservation_hours h
     where h.restaurant_id = p_restaurant and h.weekday = extract(dow from v_local)::int
       and v_local::time >= h.opens
       and v_local::time + make_interval(mins => v_r.reservation_slot_minutes) <= h.closes
       and mod((extract(epoch from (v_local::time - h.opens)) / 60)::int, v_r.reservation_slot_minutes) = 0
  ) into v_valida;
  if not v_valida then raise exception 'FRANJA_INVALIDA' using errcode = 'P0001'; end if;

  -- Freno a reservas falsas: máximo 2 reservas vigentes por celular…
  if (select count(*) from reservations
       where restaurant_id = p_restaurant and phone = p_phone
         and status::text in ('pendiente', 'confirmada') and slot_start > now()) >= 2 then
    raise exception 'DEMASIADAS_RESERVAS' using errcode = 'P0001';
  end if;
  -- …y máximo 5 por hora desde la misma conexión
  if v_origin is not null and (select count(*) from reservations
       where restaurant_id = p_restaurant and origin_hash = v_origin
         and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'DEMASIADAS_RESERVAS' using errcode = 'P0001';
  end if;

  -- Bloqueo por restaurante y franja: dos reservas al tiempo no pueden pasarse del cupo
  perform pg_advisory_xact_lock(hashtext('reserva:' || p_restaurant::text || ':' || p_start::text));
  select coalesce(sum(party_size), 0) into v_ocupado from reservations
   where restaurant_id = p_restaurant and slot_start = p_start and status::text in ('pendiente', 'confirmada', 'llego');
  if v_ocupado + p_party > v_r.reservation_capacity then raise exception 'SIN_CUPO' using errcode = 'P0001'; end if;

  insert into reservations (restaurant_id, slot_start, party_size, name, phone, email, note, status,
                            data_consent_at, privacy_version, is_demo, origin_hash)
  values (p_restaurant, p_start, p_party, trim(p_name), p_phone, lower(trim(p_email)), nullif(trim(p_note), ''),
          case when v_r.reservation_auto_confirm then 'confirmada' else 'pendiente' end::reservation_status,
          now(), v_r.privacy_version, v_r.demo_mode, v_origin)
  returning * into v_res;

  return jsonb_build_object('id', v_res.id, 'cancel_token', v_res.cancel_token, 'status', v_res.status,
    'slot_start', v_res.slot_start, 'party_size', v_res.party_size, 'name', v_res.name, 'email', v_res.email);
end $$;
revoke all on function create_reservation(uuid, timestamptz, int, text, text, text, text, boolean, text) from public;
grant execute on function create_reservation(uuid, timestamptz, int, text, text, text, text, boolean, text) to anon, authenticated;

-- PostgREST debe enterarse de las funciones y columnas nuevas
notify pgrst, 'reload schema';

select 'ok' as fase7,
       (select count(*) from information_schema.columns
         where table_name = 'orders' and column_name in ('notes', 'origin_hash')) as columnas_pedidos,
       (select count(*) from information_schema.columns
         where table_name = 'restaurants' and column_name = 'transfer_info') as columna_transferencia;
