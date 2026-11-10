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
  horario: Tramo[];
  estado: EstadoApertura;
};

export type EstadoPedido = "recibido" | "preparando" | "en_camino" | "cancelado";
export type FormaPago = "efectivo" | "transferencia";

/** Lo que devuelve get_order(id): la vista pública del pedido. */
export type PedidoPublico = {
  id: string;
  number: number;
  status: EstadoPedido;
  first_name: string;
  address: string;
  payment_method: FormaPago;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  preparing_at: string | null;
  dispatched_at: string | null;
  prep_delay_minutes: number;
  items: { name: string; quantity: number; line_total: number }[];
};

/** Pedido completo, solo para la cocina. */
export type PedidoCocina = {
  id: string;
  daily_number: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  address_notes: string | null;
  payment_method: FormaPago;
  cash_change_for: number | null;
  status: EstadoPedido;
  total: number;
  created_at: string;
  dispatched_at: string | null;
  order_items: { id: string; product_name: string; quantity: number }[];
};
