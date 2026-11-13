export type Producto = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  badge: string | null;
  position: number;
  /** Foto del plato (opcional). Sin foto se muestra el dibujo de la categoría. */
  image_url?: string | null;
};

export type Categoria = {
  id: string;
  name: string;
  slug: string;
  position: number;
  products: Producto[];
};

export type Tramo = { weekday: number; opens: string; closes: string };

/** Lo que devuelve opening_status() en la base de datos. */
export type EstadoApertura = {
  open: boolean;
  closes_at: string | null;
  next_open: string | null;
  /** Dentro del horario, pero el restaurante pausó los pedidos a mano. */
  paused: boolean;
};

export type RolMiembro = "admin" | "cocina" | "mesero";

/** Una fila de la tabla `restaurants`: toda la configuración de un restaurante. */
export type FilaRestaurante = Omit<Ajustes, "horario" | "estado">;

/**
 * El restaurante que se está visitando, con su horario y si está abierto ahora.
 * (Se sigue llamando "Ajustes" en el código para no cambiar cada componente.)
 */
export type Ajustes = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  domain: string | null;
  logo_url: string | null;
  mascot: string;
  color_brand: string;
  color_accent: string;
  color_band: string;
  mod_delivery: boolean;
  mod_pickup: boolean;
  mod_table: boolean;
  mod_reservations: boolean;
  mod_reviews: boolean;
  mod_menu_qr: boolean;
  pickup_lead_minutes: number;
  reservation_slot_minutes: number;
  reservation_capacity: number;
  reservation_max_party: number;
  reservation_days_ahead: number;
  reservation_lead_minutes: number;
  reservation_auto_confirm: boolean;
  delivery_fee: number;
  min_order: number;
  prep_delay_minutes: number;
  /** Interruptor manual (pausar pedidos). Para saber si se puede pedir, usa `estado.open`. */
  is_open: boolean;
  timezone: string;
  demo_mode: boolean;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  maps_url: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  legal_name: string | null;
  legal_id: string | null;
  privacy_email: string | null;
  privacy_version: string;
  /** Datos para transferir (Nequi, cuenta…), texto libre. Vacío = no se muestra. */
  transfer_info?: string | null;
  horario: Tramo[];
  estado: EstadoApertura;
};

export type EstadoPedido =
  | "por_confirmar"
  | "recibido"
  | "preparando"
  | "listo_recoger"
  | "en_camino"
  | "va_mesa"
  | "entregado"
  | "cancelado";
export type TipoPedido = "domicilio" | "recoger" | "mesa";
export type FormaPago = "efectivo" | "transferencia";

/** Lo que devuelve get_order(id): la vista pública del pedido. */
export type PedidoPublico = {
  id: string;
  number: number;
  status: EstadoPedido;
  type: TipoPedido;
  first_name: string;
  address: string | null;
  payment_method: FormaPago;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  preparing_at: string | null;
  dispatched_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  pickup_at: string | null;
  table_label?: string | null;
  prep_delay_minutes: number;
  /** Notas que dejó el cliente ("sin cebolla"…). */
  notes?: string | null;
  /** Si el cliente dejó correo (para saber si se le avisa por ahí). */
  has_email?: boolean;
  items: { name: string; quantity: number; line_total: number }[];
};

/** Pedido completo, solo para la cocina. */
export type PedidoCocina = {
  id: string;
  daily_number: number;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  order_type: TipoPedido;
  table_label: string | null;
  table_session_id: string | null;
  address: string | null;
  address_notes: string | null;
  /** Notas del pedido para la cocina. */
  notes: string | null;
  pickup_at: string | null;
  payment_method: FormaPago | null;
  cash_change_for: number | null;
  status: EstadoPedido;
  total: number;
  created_at: string;
  dispatched_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  courier_id: string | null;
  offered_at: string | null;
  delivery_token: string | null;
  order_items: { id: string; product_name: string; quantity: number }[];
};

/** Cuenta de mesa tal como la ve el cliente (table_session_view). */
export type CuentaMesa = {
  status: "abierta" | "cerrada";
  confirmed: boolean;
  table_label: string;
  total: number;
  calls: ("mesero" | "cuenta")[];
  orders: {
    id: string;
    number: number;
    status: EstadoPedido;
    name: string;
    total: number;
    items: { name: string; quantity: number }[];
  }[];
};

/** Lo que devuelve open_table_session al escanear el QR. */
export type SesionMesa = {
  session_id: string;
  access_code: string;
  table_id: string;
  table_label: string;
  restaurant_id: string;
  confirmed: boolean;
};

/** Domiciliario del restaurante. */
export type Domiciliario = { id: string; name: string; phone: string; token: string; active: boolean };

/** Lo que ve el domiciliario en su link personal (courier_view). */
export type VistaDomiciliario = {
  id: string;
  name: string;
  restaurant_id: string;
  offered: { id: string; number: number; address: string; total: number; items: number; offered_at: string }[];
  mine: { id: string; number: number; address: string; total: number; delivery_token: string; assigned_at: string }[];
};

/** Datos del link privado de una entrega (get_delivery). */
export type Entrega = {
  id: string;
  number: number;
  status: EstadoPedido;
  customer_name: string;
  customer_phone: string | null;
  address: string | null;
  address_notes: string | null;
  payment_method: FormaPago | null;
  payment_status: "pendiente" | "pagado";
  cash_change_for: number | null;
  total: number;
  delivery_fee: number;
  courier_name: string | null;
  restaurant_name: string;
  restaurant_phone: string | null;
  notes?: string | null;
  /** Datos para transferir que configuró el restaurante. */
  transfer_info?: string | null;
  items: { name: string; quantity: number }[];
};

export type EstadoReserva = "pendiente" | "confirmada" | "cancelada" | "llego" | "no_llego";

/** Franja de reserva con su cupo libre (reservation_slots). */
export type FranjaReserva = { start: string; available: number };

/** Reserva vista por el cliente desde su link (get_reservation). */
export type ReservaPublica = {
  id: string;
  status: EstadoReserva;
  slot_start: string;
  party_size: number;
  name: string;
  note: string | null;
  restaurant_id: string;
  can_cancel: boolean;
};

/** Reserva completa, para el panel. */
export type Reserva = {
  id: string;
  slot_start: string;
  party_size: number;
  name: string;
  phone: string;
  email: string;
  note: string | null;
  status: EstadoReserva;
  created_at: string;
};
