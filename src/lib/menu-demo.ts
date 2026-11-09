import type { Ajustes, Categoria } from "@/lib/tipos";

// Menú de muestra (el mismo de supabase/seed.sql) para ver la web antes de conectar Supabase.
const filas: [string, string, string, number, string | null][] = [
  ["Platos del día", "Bandeja de la casa", "Frijoles, arroz, carne molida, chicharrón, huevo, plátano maduro y arepa.", 28000, "Favorito de Tato"],
  ["Platos del día", "Pechuga a la plancha", "Con arroz, ensalada fresca y papas a la francesa.", 22000, null],
  ["Platos del día", "Sobrebarriga en salsa", "Sobrebarriga criolla, arroz blanco, papa salada y ensalada.", 26000, null],
  ["Platos del día", "Ajiaco santafereño", "Con pollo desmechado, mazorca, crema, alcaparras y aguacate.", 24000, null],
  ["Platos del día", "Arroz con pollo", "Arroz amarillo con pollo, verduras, papa a la francesa y ensalada.", 19000, null],
  ["Hamburguesas", "Hamburguesa Tato", "Carne de res 150 g, queso doble crema, tocineta, cebolla caramelizada.", 25000, "Nueva"],
  ["Hamburguesas", "Hamburguesa clásica", "Carne de res 150 g, queso, lechuga, tomate y salsa de la casa.", 19000, null],
  ["Hamburguesas", "Hamburguesa de pollo", "Pechuga apanada, queso, lechuga y mayonesa de ajo.", 20000, null],
  ["Para acompañar", "Papas a la francesa", "Porción grande con salsa de la casa.", 7000, null],
  ["Para acompañar", "Patacones con hogao", "Cuatro patacones crocantes con hogao casero.", 8000, null],
  ["Para acompañar", "Arepa con queso", "Arepa de maíz asada con queso derretido.", 5000, null],
  ["Bebidas", "Limonada de coco", "Natural, bien fría. 400 ml.", 8000, null],
  ["Bebidas", "Jugo natural en agua", "Mora, maracuyá, lulo o mango. 400 ml.", 6000, null],
  ["Bebidas", "Gaseosa", "Personal 400 ml.", 4000, null],
  ["Bebidas", "Agua", "Botella 600 ml.", 3000, null],
  ["Postres", "Tres leches", "Porción casera.", 9000, null],
  ["Postres", "Postre de natas", "Receta de la abuela.", 8500, null],
];

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-");

export const MENU_DEMO: Categoria[] = [...new Set(filas.map((f) => f[0]))].map((nombre, ci) => ({
  id: `demo-${slug(nombre)}`,
  name: nombre,
  slug: slug(nombre),
  position: ci + 1,
  products: filas
    .filter((f) => f[0] === nombre)
    .map(([, name, description, price, badge], pi) => ({
      id: `demo-${slug(name)}`,
      category_id: `demo-${slug(nombre)}`,
      name,
      description,
      price,
      badge,
      position: pi + 1,
    })),
}));

export const AJUSTES_DEMO: Ajustes = {
  delivery_fee: 4000,
  min_order: 0,
  prep_delay_minutes: 2,
  is_open: true,
};
