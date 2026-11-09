// Quita el fondo blanco de una ilustración de Tato y la deja lista para la web.
// Uso:  node scripts/quitar-fondo.mjs ruta/a/imagen.png public/tato/libreta.png
//
// Cómo funciona: "pinta" desde los bordes de la imagen todo el blanco que toca el exterior
// y lo vuelve transparente. Lo blanco que está DENTRO del contorno negro (el gorro, los ojos)
// no se toca, porque el contorno lo encierra.
import sharp from "sharp";

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) {
  console.error("Uso: node scripts/quitar-fondo.mjs <entrada> <salida.png>");
  process.exit(1);
}

const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const blanco = (i) => data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232;

const visto = new Uint8Array(w * h);
const pila = [];
for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);

while (pila.length) {
  const p = pila.pop();
  if (visto[p]) continue;
  const i = p * 4;
  if (!blanco(i)) continue;
  visto[p] = 1;
  data[i + 3] = 0;
  const x = p % w;
  if (x > 0) pila.push(p - 1);
  if (x < w - 1) pila.push(p + 1);
  if (p >= w) pila.push(p - w);
  if (p < w * (h - 1)) pila.push(p + w);
}

// Borde suave: los píxeles claros que tocan el fondo quedan semitransparentes (sin halo blanco).
for (let p = 0; p < w * h; p++) {
  if (visto[p]) continue;
  const x = p % w;
  const vecinoFondo =
    (x > 0 && visto[p - 1]) || (x < w - 1 && visto[p + 1]) || (p >= w && visto[p - w]) || (p < w * (h - 1) && visto[p + w]);
  if (!vecinoFondo) continue;
  const i = p * 4;
  const luz = (data[i] + data[i + 1] + data[i + 2]) / 3;
  if (luz > 180) data[i + 3] = Math.round(255 * (1 - (luz - 180) / 75));
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .trim({ threshold: 1 })
  .png({ compressionLevel: 9 })
  .toFile(salida);

const meta = await sharp(salida).metadata();
console.log(`Listo: ${salida} (${meta.width}×${meta.height}). Usa ese tamaño en src/components/tato.tsx`);
