-- =====================================================================
-- Fase 2: tipos de pedido (domicilio, para recoger, en mesa) y estados nuevos.
-- recibido → preparando → (listo_recoger | en_camino | va_mesa) → entregado
-- Se pega completo en el SQL Editor (después de 0004).
-- =====================================================================

-- Estados nuevos (se agregan al tipo existente)
alter type order_status add value if not exists 'listo_recoger';
alter type order_status add value if not exists 'va_mesa';
alter type order_status add value if not exists 'entregado';

create type order_type as enum ('domicilio', 'recoger', 'mesa');

alter table orders
  add column if not exists order_type   order_type not null default 'domicilio',
  add column if not exists pickup_at    timestamptz,   -- hora aproximada en que el cliente recoge
  add column if not exists ready_at     timestamptz,   -- cuándo quedó listo para recoger / salió a la mesa
  add column if not exists delivered_at timestamptz;   -- cuándo se entregó

-- La dirección solo es obligatoria en domicilio
alter table orders alter column address drop not null;
alter table orders add constraint domicilio_con_direccion
  check (order_type <> 'domicilio' or address is not null);

-- Para recoger: minutos mínimos de preparación antes de la primera hora disponible
alter table restaurants add column if not exists pickup_lead_minutes int not null default 20
  check (pickup_lead_minutes between 5 and 180);

-- ---------- Horas de cada cambio de estado ----------
create or replace function stamp_dispatch() returns trigger
language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status::text = 'en_camino' then new.dispatched_at := coalesce(new.dispatched_at, now()); end if;
    if new.status::text in ('listo_recoger', 'va_mesa') then new.ready_at := coalesce(new.ready_at, now()); end if;
    if new.status::text = 'entregado' then new.delivered_at := coalesce(new.delivered_at, now()); end if;
  end if;
  return new;
end $$;

create or replace function broadcast_order_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform realtime.send(
      jsonb_build_object('status', new.status, 'preparing_at', new.preparing_at,
                         'dispatched_at', new.dispatched_at, 'ready_at', new.ready_at,
                         'delivered_at', new.delivered_at),
      'estado', 'pedido:' || new.id::text, false);
  end if;
  return new;
end $$;

-- ---------- Crear pedido: ahora con tipo y hora de recogida ----------
drop function if exists create_order(uuid, text, text, text, text, text, payment_method, int, jsonb, boolean);

create or replace function create_order(
  p_restaurant uuid, p_type order_type,
  p_name text, p_phone text, p_email text, p_address text, p_address_notes text,
  p_payment_method payment_method, p_cash_change_for int, p_items jsonb, p_consent boolean,
  p_pickup_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_r restaurants; v_order_id uuid; v_subtotal int := 0; v_number int;
  v_item jsonb; v_product products; v_qty int; v_today date; v_fee int; v_local timestamp;
begin
  select * into v_r from restaurants where id = p_restaurant;
  if not found then raise exception 'RESTAURANTE_NO_EXISTE' using errcode = 'P0001'; end if;

  -- El tipo de pedido debe estar activo en el restaurante
  if (p_type = 'domicilio' and not v_r.mod_delivery)
     or (p_type = 'recoger' and not v_r.mod_pickup)
     or p_type = 'mesa' then   -- la mesa llega en la Fase 3
    raise exception 'MODULO_INACTIVO' using errcode = 'P0001';
  end if;

  v_today := (now() at time zone v_r.timezone)::date;
  if not coalesce((opening_status(p_restaurant)->>'open')::boolean, false) then
    raise exception 'CERRADO' using errcode = 'P0001';
  end if;
  if p_consent is not true then raise exception 'SIN_AUTORIZACION' using errcode = 'P0001'; end if;

  if p_type = 'domicilio' then
    if p_address is null or char_length(trim(p_address)) < 5 then
      raise exception 'SIN_DIRECCION' using errcode = 'P0001';
    end if;
    v_fee := v_r.delivery_fee;
  else
    v_fee := 0;
  end if;

  if p_type = 'recoger' then
    if p_pickup_at is null then raise exception 'SIN_HORA' using errcode = 'P0001'; end if;
    v_local := p_pickup_at at time zone v_r.timezone;
    -- Hoy, después del tiempo mínimo de preparación (con 2 min de tolerancia) y dentro del horario
    if v_local::date <> v_today
       or p_pickup_at < now() + make_interval(mins => v_r.pickup_lead_minutes - 2)
       or not exists (select 1 from opening_hours
                       where restaurant_id = p_restaurant
                         and weekday = extract(dow from v_local)::int
                         and v_local::time >= opens and v_local::time <= closes) then
      raise exception 'HORA_INVALIDA' using errcode = 'P0001';
    end if;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CARRITO_VACIO' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 40 then raise exception 'DEMASIADOS_ITEMS' using errcode = 'P0001'; end if;

  perform pg_advisory_xact_lock(hashtext('daily_number:' || p_restaurant::text));
  select coalesce(max(daily_number), 0) + 1 into v_number from orders
   where restaurant_id = p_restaurant and (created_at at time zone v_r.timezone)::date = v_today;

  insert into orders (restaurant_id, order_type, daily_number, customer_name, customer_phone, customer_email,
                      address, address_notes, pickup_at, payment_method, cash_change_for,
                      subtotal, delivery_fee, total, data_consent_at, privacy_version, is_demo)
  values (p_restaurant, p_type, v_number, trim(p_name), p_phone, lower(trim(p_email)),
          case when p_type = 'domicilio' then trim(p_address) end,
          case when p_type = 'domicilio' then nullif(trim(p_address_notes), '') end,
          case when p_type = 'recoger' then p_pickup_at end,
          p_payment_method,
          case when p_payment_method = 'efectivo' then p_cash_change_for end,
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

  if v_subtotal < v_r.min_order then raise exception 'PEDIDO_MINIMO' using errcode = 'P0001'; end if;
  update orders set subtotal = v_subtotal, total = v_subtotal + delivery_fee where id = v_order_id;
  return v_order_id;
end $$;

revoke all on function create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz) from public;
grant execute on function create_order(uuid, order_type, text, text, text, text, text, payment_method, int, jsonb, boolean, timestamptz) to anon, authenticated;

-- ---------- Vista pública del pedido: con tipo, hora de recogida y horas de cada estado ----------
create or replace function get_order(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.daily_number, 'status', o.status, 'type', o.order_type,
    'first_name', split_part(o.customer_name, ' ', 1), 'address', o.address,
    'payment_method', o.payment_method, 'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'created_at', o.created_at, 'preparing_at', o.preparing_at,
    'dispatched_at', o.dispatched_at, 'ready_at', o.ready_at, 'delivered_at', o.delivered_at,
    'pickup_at', o.pickup_at, 'prep_delay_minutes', r.prep_delay_minutes,
    'restaurant_id', o.restaurant_id,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity,
                                          'line_total', i.line_total) order by i.product_name)
        from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o join restaurants r on r.id = o.restaurant_id
  where o.id = p_id;
$$;

select 'ok' as fase2,
       (select count(*) from orders) as pedidos,
       (select pickup_lead_minutes from restaurants where slug = 'donde-tato') as minutos_recoger;
