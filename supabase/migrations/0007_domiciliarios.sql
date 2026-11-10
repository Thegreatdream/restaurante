-- =====================================================================
-- Fase 4: domiciliarios.
-- El restaurante registra a sus domiciliarios. Al despachar, la cocina asigna uno
-- o lo ofrece a todos (el primero que toca "Lo llevo yo" se lo queda, con bloqueo).
-- Cada pedido tiene un link privado /entrega/[token] y cada domiciliario uno personal.
-- Se pega completo en el SQL Editor (después de 0006).
-- =====================================================================

create table couriers (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants on delete cascade,
  name          text not null check (char_length(name) between 2 and 40),
  phone         text not null check (phone ~ '^3[0-9]{9}$'),
  token         text not null unique default replace(gen_random_uuid()::text, '-', ''),  -- su link personal
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on couriers (restaurant_id, active);

alter table orders
  add column if not exists courier_id     uuid references couriers on delete set null,
  add column if not exists delivery_token text unique,     -- link privado /entrega/[token]
  add column if not exists offered_at     timestamptz,     -- ofrecido a todos los domiciliarios
  add column if not exists assigned_at    timestamptz;

alter table couriers enable row level security;
create policy "equipo ve domiciliarios" on couriers for select using (is_member(restaurant_id));
create policy "admin domiciliarios"     on couriers for all
  using (is_member(restaurant_id, '{admin}')) with check (is_member(restaurant_id, '{admin}'));

-- ---------- Lo que ve el domiciliario en su link personal ----------
create or replace function courier_view(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'restaurant_id', c.restaurant_id,
    -- Disponibles: ofrecidos a todos y que nadie ha tomado
    'offered', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'number', o.daily_number, 'address', o.address, 'total', o.total,
        'items', (select coalesce(sum(i.quantity), 0) from order_items i where i.order_id = o.id),
        'offered_at', o.offered_at) order by o.offered_at)
      from orders o
      where o.restaurant_id = c.restaurant_id and o.offered_at is not null and o.courier_id is null
        and o.order_type = 'domicilio' and o.status::text in ('recibido', 'preparando')), '[]'::jsonb),
    -- Mis entregas: asignadas a este domiciliario y aún sin entregar
    'mine', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'number', o.daily_number, 'address', o.address, 'total', o.total,
        'delivery_token', o.delivery_token, 'assigned_at', o.assigned_at) order by o.assigned_at)
      from orders o
      where o.courier_id = c.id and o.status::text = 'en_camino'), '[]'::jsonb))
  from couriers c
  where c.token = p_token and c.active;
$$;
grant execute on function courier_view(text) to anon, authenticated;

-- ---------- "Lo llevo yo": el primero que toca se lo queda ----------
create or replace function claim_delivery(p_token text, p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_c couriers; v_o orders;
begin
  select * into v_c from couriers where token = p_token and active;
  if not found then raise exception 'DOMICILIARIO_NO_EXISTE' using errcode = 'P0001'; end if;

  -- Bloqueo en la misma actualización: solo una fila cumple "courier_id is null", aunque dos toquen a la vez
  update orders
     set courier_id = v_c.id, assigned_at = now(), status = 'en_camino',
         delivery_token = coalesce(delivery_token, replace(gen_random_uuid()::text, '-', ''))
   where id = p_order and restaurant_id = v_c.restaurant_id and courier_id is null
     and offered_at is not null and order_type = 'domicilio' and status::text in ('recibido', 'preparando')
  returning * into v_o;

  if v_o.id is null then raise exception 'YA_TOMADO' using errcode = 'P0001'; end if;

  -- Datos para avisar al cliente por correo que su pedido va en camino
  return jsonb_build_object(
    'id', v_o.id, 'daily_number', v_o.daily_number, 'customer_name', v_o.customer_name,
    'customer_email', v_o.customer_email, 'order_type', v_o.order_type, 'address', v_o.address,
    'pickup_at', v_o.pickup_at, 'total', v_o.total, 'payment_method', v_o.payment_method,
    'delivery_token', v_o.delivery_token,
    'order_items', coalesce((select jsonb_agg(jsonb_build_object('product_name', i.product_name, 'quantity', i.quantity))
                              from order_items i where i.order_id = v_o.id), '[]'::jsonb));
end $$;
grant execute on function claim_delivery(text, uuid) to anon, authenticated;

-- ---------- Link privado de la entrega ----------
create or replace function get_delivery(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'number', o.daily_number, 'status', o.status,
    'customer_name', o.customer_name, 'customer_phone', o.customer_phone,
    'address', o.address, 'address_notes', o.address_notes,
    'payment_method', o.payment_method, 'payment_status', o.payment_status,
    'cash_change_for', o.cash_change_for, 'total', o.total, 'delivery_fee', o.delivery_fee,
    'courier_name', c.name, 'restaurant_name', r.name, 'restaurant_phone', r.phone,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.product_name, 'quantity', i.quantity)
                                         order by i.product_name)
                         from order_items i where i.order_id = o.id), '[]'::jsonb))
  from orders o
  join restaurants r on r.id = o.restaurant_id
  left join couriers c on c.id = o.courier_id
  where o.delivery_token = p_token;
$$;
grant execute on function get_delivery(text) to anon, authenticated;

-- ---------- "Marcar como entregado" desde el link de entrega ----------
create or replace function complete_delivery(p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update orders set status = 'entregado'
   where delivery_token = p_token and status::text = 'en_camino'
  returning id into v_id;
  if v_id is null then raise exception 'NO_EN_CAMINO' using errcode = 'P0001'; end if;
end $$;
grant execute on function complete_delivery(text) to anon, authenticated;

select 'ok' as fase4;
