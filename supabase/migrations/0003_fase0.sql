-- =====================================================================
-- Fase 0: horario real, contacto, autorización de datos (Ley 1581) y modo demostración.
-- Se pega completo en Supabase → SQL Editor → Run (después de 0001 y 0002).
-- =====================================================================

-- ---------- Ajustes nuevos ----------
alter table settings
  add column if not exists timezone        text    not null default 'America/Bogota',
  add column if not exists demo_mode       boolean not null default false,
  -- Contacto (vacío = no se muestra)
  add column if not exists address         text,
  add column if not exists phone           text,      -- solo números, p. ej. 6011234567
  add column if not exists whatsapp        text,      -- con indicativo, p. ej. 573001234567
  add column if not exists maps_url        text,
  add column if not exists instagram       text,      -- usuario sin @
  add column if not exists facebook        text,      -- usuario o página
  add column if not exists tiktok          text,      -- usuario sin @
  -- Responsable del tratamiento de datos (política de privacidad)
  add column if not exists legal_name      text,
  add column if not exists legal_id        text,      -- NIT o cédula
  add column if not exists privacy_email   text,
  add column if not exists privacy_version text    not null default '2026-11-09';

comment on column settings.is_open is
  'Interruptor manual: en false pausa los pedidos aunque esté dentro del horario.';

-- ---------- Horario por días (0 = domingo … 6 = sábado). Puede haber varios tramos por día ----------
create table if not exists opening_hours (
  id      uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  opens   time not null,
  closes  time not null check (closes > opens)
);
alter table opening_hours enable row level security;
drop policy if exists "horario publico" on opening_hours;
drop policy if exists "staff horario" on opening_hours;
create policy "horario publico" on opening_hours for select using (true);
create policy "staff horario"   on opening_hours for all using (is_staff()) with check (is_staff());

-- Horario inicial: todos los días de 12 m. a 5 p. m.
insert into opening_hours (weekday, opens, closes)
select d, '12:00', '17:00' from generate_series(0, 6) d
where not exists (select 1 from opening_hours);

-- ---------- ¿Está abierto ahora? y ¿cuándo abre / cierra? ----------
create or replace function opening_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz      text;
  v_manual  boolean;
  v_now     timestamp;   -- hora local del restaurante, sin zona
  v_today   date;
  v_dow     int;
  v_tramo   record;
  v_next    timestamp;
  v_en_horario boolean;
  i         int;
begin
  select timezone, is_open into v_tz, v_manual from settings limit 1;
  v_now   := now() at time zone v_tz;
  v_today := v_now::date;
  v_dow   := extract(dow from v_now)::int;

  -- ¿Dentro de un tramo de hoy?
  select opens, closes into v_tramo from opening_hours
   where weekday = v_dow and v_now::time >= opens and v_now::time < closes
   order by opens limit 1;
  v_en_horario := found;

  if v_en_horario and v_manual then
    return jsonb_build_object(
      'open', true,
      'closes_at', ((v_today + v_tramo.closes) at time zone v_tz),
      'next_open', null,
      'paused', false);
  end if;

  -- Próxima apertura en los siguientes 7 días
  for i in 0..7 loop
    select (v_today + i) + opens into v_next from opening_hours
     where weekday = (v_dow + i) % 7
       and (i > 0 or opens > v_now::time)
     order by opens limit 1;
    exit when v_next is not null;
  end loop;

  return jsonb_build_object(
    'open', false,
    'closes_at', null,
    'next_open', case when v_next is null then null else (v_next at time zone v_tz) end,
    'paused', (v_en_horario and not v_manual));
end $$;

grant execute on function opening_status() to anon, authenticated;

-- ---------- Pedidos: autorización de datos y marca de prueba ----------
alter table orders
  add column if not exists data_consent_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists is_demo         boolean not null default false;

-- create_order ahora exige autorización y respeta el horario real.
drop function if exists create_order(text, text, text, text, text, payment_method, int, jsonb);

create or replace function create_order(
  p_name text, p_phone text, p_email text, p_address text, p_address_notes text,
  p_payment_method payment_method, p_cash_change_for int, p_items jsonb, p_consent boolean
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
  v_today     date;
begin
  select * into v_settings from settings limit 1;
  v_today := (now() at time zone v_settings.timezone)::date;

  if not coalesce((opening_status()->>'open')::boolean, false) then
    raise exception 'CERRADO' using errcode = 'P0001';
  end if;
  if p_consent is not true then
    raise exception 'SIN_AUTORIZACION' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CARRITO_VACIO' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 40 then
    raise exception 'DEMASIADOS_ITEMS' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('daily_number'));
  select coalesce(max(daily_number), 0) + 1 into v_number
    from orders where (created_at at time zone v_settings.timezone)::date = v_today;

  insert into orders (daily_number, customer_name, customer_phone, customer_email, address,
                      address_notes, payment_method, cash_change_for, subtotal, delivery_fee, total,
                      data_consent_at, privacy_version, is_demo)
  values (v_number, trim(p_name), p_phone, lower(trim(p_email)), trim(p_address),
          nullif(trim(p_address_notes), ''), p_payment_method,
          case when p_payment_method = 'efectivo' then p_cash_change_for end,
          0, v_settings.delivery_fee, 0,
          now(), v_settings.privacy_version, v_settings.demo_mode)
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

  update orders set subtotal = v_subtotal, total = v_subtotal + delivery_fee where id = v_order_id;
  return v_order_id;
end $$;

revoke all on function create_order(text, text, text, text, text, payment_method, int, jsonb, boolean) from public;
grant execute on function create_order(text, text, text, text, text, payment_method, int, jsonb, boolean) to anon, authenticated;

-- ---------- Borrar pedidos de prueba (solo personal) ----------
create or replace function delete_demo_orders() returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_staff() then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  delete from orders where is_demo;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function delete_demo_orders() from public;
grant execute on function delete_demo_orders() to authenticated;

-- ---------- Esta instalación es una demostración ----------
update settings set demo_mode = true;
-- Los pedidos de prueba creados antes de esta migración también cuentan como demostración.
update orders set is_demo = true where customer_name = 'Prueba Claude';
