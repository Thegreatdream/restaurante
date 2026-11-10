-- =====================================================================
-- Fase 5: reservas.
-- El restaurante configura su horario de reservas, la duración de cada franja y el cupo
-- máximo de personas por franja. La base de datos no deja reservar sin cupo.
-- Se pega completo en el SQL Editor (después de 0007).
-- =====================================================================

create type reservation_status as enum ('pendiente', 'confirmada', 'cancelada', 'llego', 'no_llego');

alter table restaurants
  add column if not exists reservation_slot_minutes  int not null default 30 check (reservation_slot_minutes in (15, 30, 45, 60, 90, 120)),
  add column if not exists reservation_capacity      int not null default 20 check (reservation_capacity between 1 and 500),
  add column if not exists reservation_max_party     int not null default 8  check (reservation_max_party between 1 and 50),
  add column if not exists reservation_days_ahead    int not null default 30 check (reservation_days_ahead between 1 and 180),
  add column if not exists reservation_lead_minutes  int not null default 60 check (reservation_lead_minutes between 0 and 2880),
  add column if not exists reservation_auto_confirm  boolean not null default true;

-- Horario de reservas (puede ser distinto al de pedidos). Empieza igual al de pedidos.
create table reservation_hours (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),
  opens         time not null,
  closes        time not null check (closes > opens)
);
create index on reservation_hours (restaurant_id, weekday);
insert into reservation_hours (restaurant_id, weekday, opens, closes)
select restaurant_id, weekday, opens, closes from opening_hours;

create table reservations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references restaurants on delete cascade,
  slot_start      timestamptz not null,
  party_size      int not null check (party_size between 1 and 50),
  name            text not null check (char_length(name) between 2 and 80),
  phone           text not null check (phone ~ '^3[0-9]{9}$'),
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  note            text check (char_length(note) <= 300),
  status          reservation_status not null default 'pendiente',
  cancel_token    text not null unique default replace(gen_random_uuid()::text, '-', ''),
  data_consent_at timestamptz not null,
  privacy_version text,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on reservations (restaurant_id, slot_start);

alter table reservation_hours enable row level security;
alter table reservations      enable row level security;
create policy "horario reservas publico" on reservation_hours for select using (true);
create policy "admin horario reservas"   on reservation_hours for all
  using (is_member(restaurant_id, '{admin}')) with check (is_member(restaurant_id, '{admin}'));
create policy "equipo ve reservas"       on reservations for select using (is_member(restaurant_id));
create policy "equipo gestiona reservas" on reservations for update
  using (is_member(restaurant_id, '{admin,mesero}')) with check (is_member(restaurant_id, '{admin,mesero}'));

alter publication supabase_realtime add table reservations;

-- ---------- Franjas disponibles de un día ----------
create or replace function reservation_slots(p_restaurant uuid, p_date date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_r restaurants; v_tramo record; v_t timestamp; v_inicio timestamptz; v_ocupado int;
  v_res jsonb := '[]'::jsonb; v_hoy date;
begin
  select * into v_r from restaurants where id = p_restaurant;
  if not found or not v_r.mod_reservations then return '[]'::jsonb; end if;
  v_hoy := (now() at time zone v_r.timezone)::date;
  if p_date < v_hoy or p_date > v_hoy + v_r.reservation_days_ahead then return '[]'::jsonb; end if;

  for v_tramo in
    select opens, closes from reservation_hours
     where restaurant_id = p_restaurant and weekday = extract(dow from p_date)::int order by opens
  loop
    v_t := p_date + v_tramo.opens;
    -- Cada franja debe caber completa dentro del tramo
    while v_t + make_interval(mins => v_r.reservation_slot_minutes) <= p_date + v_tramo.closes loop
      v_inicio := v_t at time zone v_r.timezone;
      if v_inicio >= now() + make_interval(mins => v_r.reservation_lead_minutes) then
        select coalesce(sum(party_size), 0) into v_ocupado from reservations
         where restaurant_id = p_restaurant and slot_start = v_inicio
           and status::text in ('pendiente', 'confirmada', 'llego');
        v_res := v_res || jsonb_build_object('start', v_inicio, 'available', greatest(v_r.reservation_capacity - v_ocupado, 0));
      end if;
      v_t := v_t + make_interval(mins => v_r.reservation_slot_minutes);
    end loop;
  end loop;
  return v_res;
end $$;
grant execute on function reservation_slots(uuid, date) to anon, authenticated;

-- ---------- Crear reserva (con bloqueo para no pasarse del cupo) ----------
create or replace function create_reservation(
  p_restaurant uuid, p_start timestamptz, p_party int,
  p_name text, p_phone text, p_email text, p_note text, p_consent boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_r restaurants; v_local timestamp; v_ocupado int; v_res reservations; v_valida boolean;
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

  -- Bloqueo por restaurante y franja: dos reservas al tiempo no pueden pasarse del cupo
  perform pg_advisory_xact_lock(hashtext('reserva:' || p_restaurant::text || ':' || p_start::text));
  select coalesce(sum(party_size), 0) into v_ocupado from reservations
   where restaurant_id = p_restaurant and slot_start = p_start and status::text in ('pendiente', 'confirmada', 'llego');
  if v_ocupado + p_party > v_r.reservation_capacity then raise exception 'SIN_CUPO' using errcode = 'P0001'; end if;

  insert into reservations (restaurant_id, slot_start, party_size, name, phone, email, note, status,
                            data_consent_at, privacy_version, is_demo)
  values (p_restaurant, p_start, p_party, trim(p_name), p_phone, lower(trim(p_email)), nullif(trim(p_note), ''),
          case when v_r.reservation_auto_confirm then 'confirmada' else 'pendiente' end::reservation_status,
          now(), v_r.privacy_version, v_r.demo_mode)
  returning * into v_res;

  return jsonb_build_object('id', v_res.id, 'cancel_token', v_res.cancel_token, 'status', v_res.status,
    'slot_start', v_res.slot_start, 'party_size', v_res.party_size, 'name', v_res.name, 'email', v_res.email);
end $$;
grant execute on function create_reservation(uuid, timestamptz, int, text, text, text, text, boolean) to anon, authenticated;

-- ---------- Ver y cancelar con el link del correo ----------
create or replace function get_reservation(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', v.id, 'status', v.status, 'slot_start', v.slot_start, 'party_size', v.party_size,
    'name', split_part(v.name, ' ', 1), 'note', v.note, 'restaurant_id', v.restaurant_id,
    'can_cancel', v.status::text in ('pendiente', 'confirmada') and v.slot_start > now())
  from reservations v where v.cancel_token = p_token;
$$;
grant execute on function get_reservation(text) to anon, authenticated;

create or replace function cancel_reservation(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update reservations set status = 'cancelada', updated_at = now()
   where cancel_token = p_token and status::text in ('pendiente', 'confirmada') and slot_start > now()
  returning id into v_id;
  if v_id is null then raise exception 'NO_CANCELABLE' using errcode = 'P0001'; end if;
end $$;
grant execute on function cancel_reservation(text) to anon, authenticated;

select 'ok' as fase5, (select count(*) from reservation_hours) as tramos_reservas;

-- "Borrar pedidos de prueba" también borra las reservas de prueba
create or replace function delete_demo_orders(p_restaurant uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int; v_res int;
begin
  if not is_member(p_restaurant, '{admin,cocina}') then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
  delete from orders where restaurant_id = p_restaurant and is_demo;
  get diagnostics v_count = row_count;
  delete from reservations where restaurant_id = p_restaurant and is_demo;
  get diagnostics v_res = row_count;
  return v_count + v_res;
end $$;
