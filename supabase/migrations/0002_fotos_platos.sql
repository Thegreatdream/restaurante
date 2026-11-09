-- Foto opcional por plato. Mientras esté vacía, la web muestra el dibujo de la categoría.
alter table products add column if not exists image_url text;
