-- =====================================================================
-- Fase 1: varios restaurantes en la misma plataforma.
-- Cada restaurante tiene su configuración, sus usuarios (con rol) y solo ve lo suyo.
-- Los datos actuales pasan al restaurante "donde-tato". Se pega completo en el SQL Editor.
-- =====================================================================

-- ---------- Restaurantes ----------
create table restaurants (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name               text not null check (char_length(name) between 2 and 60),
  tagline            text check (char_length(tagline) <= 80),
  domain             text unique,                    -- p. ej. dondetato.com (sin https://)
  logo_url           text,
  mascot             text not null default 'tato',   -- carpeta de imágenes en /public
  color_brand        text not null default '#ee9a4d' check (color_brand  ~ '^#[0-9a-fA-F]{6}$'),
  color_accent       text not null default '#2e6a4e' check (color_accent ~ '^#[0-9a-fA-F]{6}$'),
  color_band         text not null default '#2b1d15' check (color_band   ~ '^#[0-9a-fA-F]{6}$'),
  timezone           text not null default 'America/Bogota',
  delivery_fee       int  not null default 4000 check (delivery_fee >= 0),
  min_order          int  not null default 0    check (min_order >= 0),
  prep_delay_minutes int  not null default 2    check (prep_delay_minutes between 0 and 60),
  is_open            boolean not null default true,   -- interruptor para pausar pedidos
  demo_mode          boolean not null default false,
  address text, phone text, whatsapp text, maps_url text,
  instagram text, facebook text, tiktok text,
  legal_name text, legal_id text, privacy_email text,
  privacy_version    text not null default '2026-11-09',
  -- Módulos que el restaurante tiene activos
  mod_delivery       boolean not null default true,
  mod_pickup         boolean not null default false,
  mod_table          boolean not null default false,
  mod_reservations   boolean not null default false,
  mod_reviews        boolean not null default false,
  mod_menu_qr        boolean not null default false,
  created_at         timestamptz not null default now()
);

insert into restaurants (slug, name, tagline, timezone, delivery_fee, min_order, prep_delay_minutes,
                         is_open, demo_mode, address, phone, whatsapp, maps_url, instagram, facebook,
                         tiktok, legal_name, legal_id, privacy_email, privacy_version)
select 'donde-tato', 'Donde Tato', 'Comida casera a domicilio', timezone, delivery_fee, min_order,
       prep_delay_minutes, is_open, demo_mode, address, phone, whatsapp, maps_url, instagram, facebook,
       tiktok, legal_name, legal_id, privacy_email, privacy_version
from settings limit 1;

-- ---------- Usuarios del panel con su rol ----------
create type member_role as enum ('admin', 'cocina', 'mesero');

create table members (
  user_id       uuid not null references auth.users on delete cascade,
  restaurant_id uuid not null references restaurants on delete cascade,
  role          member_role not null default 'cocina',
  name          text,
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

-- El personal actual queda como administrador de Donde Tato
insert into members (user_id, restaurant_id, role, name, created_at)
select s.user_id, r.id, 'admin', s.name, s.created_at
from staff s cross join restaurants r where r.slug = 'donde-tato';

create or replace function is_member(p_restaurant uuid, p_roles member_role[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members
     where user_id = auth.uid() and restaurant_id = p_restaurant
       and (p_roles is null or role = any (p_roles)));
$$;

-- ---------- Cada tabla sabe a qué restaurante pertenece ----------
alter table categories    add column restaurant_id uuid references restaurants on delete cascade;
alter table products      add column restaurant_id uuid references restaurants on delete cascade;
alter table orders        add column restaurant_id uuid references restaurants on delete cascade;
alter table order_items   add column restaurant_id uuid references restaurants on delete cascade;
alter table opening_hours add column restaurant_id uuid references restaurants on delete cascade;

update categories    set restaurant_id = (select id from restaurants where slug = 'donde-tato');
update products      set restaurant_id = (select id from restaurants where slug = 'donde-tato');
update orders        set restaurant_id = (select id from restaurants where slug = 'donde-tato');
update order_items   set restaurant_id = (select id from restaurants where slug = 'donde-tato');
update opening_hours set restaurant_id = (select id from restaurants where slug = 'donde-tato');

alter table categories    alter column restaurant_id set not null;
alter table products      alter column restaurant_id set not null;
alter table orders        alter column restaurant_id set not null;
alter table order_items   alter column restaurant_id set not null;
alter table opening_hours alter column restaurant_id set not null;

create index on categories (restaurant_id, position);
create index on products (restaurant_id, category_id);
create index on orders (restaurant_id, created_at desc);
create index on order_items (restaurant_id);
create index on opening_hours (restaurant_id, weekday);

-- El "slug" de categoría es único dentro de cada restaurante, no en toda la plataforma
alter table categories drop constraint if exists categories_slug_key;
alter table categories add constraint categories_restaurant_slug_key unique (restaurant_id, slug);

-- ---------- Seguridad (RLS) por restaurante ----------
drop policy if exists "menu publico"            on categories;
drop policy if exists "staff categorias"        on categories;
drop policy if exists "productos publico"       on products;
drop policy if exists "staff productos"         on products;
drop policy if exists "staff lee pedidos"       on orders;
drop policy if exists "staff actualiza pedido"  on orders;
drop policy if exists "staff lee items"         on order_items;
drop policy if exists "horario publico"         on opening_hours;
drop policy if exists "staff horario"           on opening_hours;

alter table restaurants enable row level security;
alter table members     enable row level security;

create policy "restaurante publico"  on restaurants for select using (true);
create policy "admin edita"          on restaurants for update
  using (is_member(id, '{admin}')) with check (is_member(id, '{admin}'));

create policy "miembro se ve"        on members for select
  using (user_id = auth.uid() or is_member(restaurant_id, '{admin}'));

create policy "menu publico"         on categories for select using (is_active or is_member(restaurant_id));
create policy "admin categorias"     on categories for all
  using (is_member(restaurant_id, '{admin}')) with check (is_member(restaurant_id, '{admin}'));

create policy "productos publico"    on products for select using (is_available or is_member(restaurant_id));
create policy "admin productos"      on products for all
  using (is_member(restaurant_id, '{admin}')) with check (is_member(restaurant_id, '{admin}'));

create policy "horario publico"      on opening_hours for select using (true);
create policy "admin horario"        on opening_hours for all
  using (is_member(restaurant_id, '{admin}')) with check (is_member(restaurant_id, '{admin}'));

create policy "equipo lee pedidos"   on orders for select using (is_member(restaurant_id));
create policy "cocina actualiza"     on orders for update
  using (is_member(restaurant_id, '{admin,cocina}')) with check (is_member(restaurant_id, '{admin,cocina}'));

create policy "equipo lee items"     on order_items for select using (is_member(restaurant_id));

-- ---------- Funciones, ahora por restaurante ----------
drop function if exists opening_status();
drop function if exists create_order(text, text, text, text, text, payment_method, int, jsonb, boolean);
drop function if exists delete_demo_orders();

create or replace function opening_status(p_restaurant uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text; v_manual boolean; v_now timestamp; v_today date; v_dow int;
  v_tramo record; v_next timestamp; v_en_horario boolean; i int;
begin
  select timezone, is_open into v_tz, v_manual from restaurants where id = p_restaurant;
  if v_tz is null then
    return jsonb_build_object('open', false, 'closes_at', null, 'next_open', null, 'paused', false);
  end if;
  v_now   := now() at time zone v_tz;
  v_today := v_now::date;
  v_dow   := extract(dow from v_now)::int;

  select opens, closes into v_tramo from opening_hours
   where restaurant_id = p_restaurant and weekday = v_dow
     and v_now::time >= opens and v_now::time < closes
   order by opens limit 1;
  v_en_horario := found;

  if v_en_horario and v_manual then
    return jsonb_build_object('open', true,
      'closes_at', ((v_today + v_tramo.closes) at time zone v_tz), 'next_open', null, 'paused', false);
  end if;

  for i in 0..7 loop
    select (v_today + i) + opens into v_next from opening_hours
     where restaurant_id = p_restaurant and weekday = (v_dow + i) % 7
       and (i > 0 or opens > v_now::time)
     order by opens limit 1;
    exit when v_next is not null;
  end loop;

  return jsonb_build_object('open', false, 'closes_at', null,
    'next_open', case when v_next is null then null else (v_next at time zone v_tz) end,
    'paused', (v_en_horario and not v_manual));
end $$;
grant execute on function opening_status(uuid) to anon, authenticated;

create or replace function create_order(
  p_restaurant uuid,
  p_name text, p_phone text, p_email text, p_address text, p_address_notes text,
  p_payment_method payment_method, p_cash_change_for int, p_items jsonb, p_consent boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_r restaurants; v_order_id uuid; v_subtotal int := 0; v_number int;
  v_item jsonb; v_product products; v_qty int; v_today date;
begin
  select * into v_r from restaurants where id = p_restaurant;
  if not found then raise exception 'RESTAURANTE_NO_EXISTE' using errcode = 'P0001'; end if;
  if not v_r.mod_delivery then raise exception 'MODULO_INACTIVO' using errcode = 'P0001'; end if;
  v_today := (now() at time zone v_r.timezone)::date;

  if not coalesce((opening_status(p_restaurant)->>'open')::boolean, false) then
    raise exception 'CERRADO' using errcode = 'P0001';
  end if;
  if p_consent is not true then raise exception 'SIN_AUTORIZACION' using errcode = 'P0001'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CARRITO_VACIO' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 40 then raise exception 'DEMASIADOS_ITEMS' using errcode = 'P0001'; end if;

  perform pg_advisory_xact_lock(hashtext('daily_number:' || p_restaurant::text));
  select coalesce(max(daily_number), 0) + 1 into v_number from orders
   where restaurant_id = p_restaurant and (created_at at time zone v_r.timezone)::date = v_today;

  insert into orders (restaurant_id, daily_number, customer_name, customer_phone, customer_email, address,
                      address_notes, payment_method, cash_change_for, subtotal, delivery_fee, total,
                      data_consent_at, privacy_version, is_demo)
  values (p_restaurant, v_number, trim(p_name), p_phone, lower(trim(p_email)), trim(p_address),
          nullif(trim(p_address_notes), ''), p_payment_method,
          case when p_payment_method = 'efectivo' then p_cash_change_for end,
          0, v_r.delivery_fee, 0, now(), v_r.privacy_version, v_r.demo_mode)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    -- El plato debe ser de ESTE restaurante y estar disponible
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
revoke all on function create_order(uuid, text, text, text, text, text, payment_method, int, jsonb, boolean) from public;
grant execute on function create_order(uuid, text, text, text, text, text, payment_method, int, jsonb, boolean) to anon, authenticated;

create or replace function get_order(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.daily_number, 'status', o.status,
    'first_name', split_part(o.customer_name, ' ', 1), 'address', o.address,
    'payment_method', o.payment_method, 'subtotal', o.subtotal, 'delivery_fee', o.delivery_fee,
    'total', o.total, 'created_at', o.created_at, 'preparing_at', o.preparing_at,
    'dispatched_at', o.dispatched_at, 'prep_delay_minutes', r.prep_delay_minutes,
    'restaurant_id', o.restaurant_id,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity,
                                          'line_total', i.line_total) order by i.product_name)
        from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o join restaurants r on r.id = o.restaurant_id
  where o.id = p_id;
$$;

create or replace function advance_received_orders() returns void
language sql security definer set search_path = public as $$
  update orders o set status = 'preparando', preparing_at = now()
    from restaurants r
   where r.id = o.restaurant_id and o.status = 'recibido'
     and o.created_at <= now() - make_interval(mins => r.prep_delay_minutes);
$$;

create or replace function delete_demo_orders(p_restaurant uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_member(p_restaurant, '{admin,cocina}') then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  delete from orders where restaurant_id = p_restaurant and is_demo;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function delete_demo_orders(uuid) from public;
grant execute on function delete_demo_orders(uuid) to authenticated;

-- ---------- Lo viejo ya no se usa ----------
drop policy if exists "ajustes publico" on settings;
drop policy if exists "staff ajustes"   on settings;
drop policy if exists "staff se ve"     on staff;
drop table settings;
drop table staff;
drop function if exists is_staff();

select r.slug, r.name,
       (select count(*) from members m where m.restaurant_id = r.id) as miembros,
       (select count(*) from products p where p.restaurant_id = r.id) as platos,
       opening_status(r.id) as estado
from restaurants r;
