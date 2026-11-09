export type Producto = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  badge: string | null;
  position: number;
};

export type Categoria = {
  id: string;
  name: string;
  slug: string;
  position: number;
  products: Producto[];
};

export type Ajustes = {
  delivery_fee: number;
  min_order: number;
  prep_delay_minutes: number;
  is_open: boolean;
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
