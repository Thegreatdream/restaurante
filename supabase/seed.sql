-- Menú inicial. Se pega en Supabase → SQL Editor → Run (después del esquema).
-- Cambia nombres, descripciones y precios libremente.

with c as (
  insert into categories (name, slug, position) values
    ('Platos del día',   'platos-del-dia', 1),
    ('Hamburguesas',     'hamburguesas',   2),
    ('Para acompañar',   'acompanantes',   3),
    ('Bebidas',          'bebidas',        4),
    ('Postres',          'postres',        5)
  returning id, slug
)
insert into products (category_id, name, description, price, badge, position)
select c.id, p.name, p.description, p.price, p.badge, p.position
from c join (values
  ('platos-del-dia', 'Bandeja de la casa',      'Frijoles, arroz, carne molida, chicharrón, huevo, plátano maduro y arepa.', 28000, 'Favorito de Tato', 1),
  ('platos-del-dia', 'Pechuga a la plancha',    'Con arroz, ensalada fresca y papas a la francesa.',                        22000, null, 2),
  ('platos-del-dia', 'Sobrebarriga en salsa',   'Sobrebarriga criolla, arroz blanco, papa salada y ensalada.',             26000, null, 3),
  ('platos-del-dia', 'Ajiaco santafereño',      'Con pollo desmechado, mazorca, crema, alcaparras y aguacate.',            24000, null, 4),
  ('platos-del-dia', 'Arroz con pollo',         'Arroz amarillo con pollo, verduras, papa a la francesa y ensalada.',     19000, null, 5),

  ('hamburguesas',   'Hamburguesa Tato',        'Carne de res 150 g, queso doble crema, tocineta, cebolla caramelizada.',  25000, 'Nueva', 1),
  ('hamburguesas',   'Hamburguesa clásica',     'Carne de res 150 g, queso, lechuga, tomate y salsa de la casa.',          19000, null, 2),
  ('hamburguesas',   'Hamburguesa de pollo',    'Pechuga apanada, queso, lechuga y mayonesa de ajo.',                      20000, null, 3),

  ('acompanantes',   'Papas a la francesa',     'Porción grande con salsa de la casa.',                                     7000, null, 1),
  ('acompanantes',   'Patacones con hogao',     'Cuatro patacones crocantes con hogao casero.',                             8000, null, 2),
  ('acompanantes',   'Arepa con queso',         'Arepa de maíz asada con queso derretido.',                                 5000, null, 3),

  ('bebidas',        'Limonada de coco',        'Natural, bien fría. 400 ml.',                                              8000, null, 1),
  ('bebidas',        'Jugo natural en agua',    'Mora, maracuyá, lulo o mango. 400 ml.',                                    6000, null, 2),
  ('bebidas',        'Gaseosa',                 'Personal 400 ml.',                                                         4000, null, 3),
  ('bebidas',        'Agua',                    'Botella 600 ml.',                                                          3000, null, 4),

  ('postres',        'Tres leches',             'Porción casera.',                                                          9000, null, 1),
  ('postres',        'Postre de natas',         'Receta de la abuela.',                                                     8500, null, 2)
) as p(cat, name, description, price, badge, position) on p.cat = c.slug;
