// Crea versiones reducidas (WebP) de las fotos de los artículos para que cada tarjeta
// descargue la foto al tamaño en que se muestra. Se ejecuta antes de construir la web;
// solo crea las que faltan o están desactualizadas. Las fotos originales no se tocan.
import { readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';

const ORIGEN = 'public/img/articulos';
const DESTINO = 'public/img/mini';
const ANCHOS = [200, 400, 700, 1000];

let sharp;
try { sharp = (await import('sharp')).default; } catch {
  console.log('⚠ Miniaturas: no está disponible "sharp"; la web usará las fotos originales.');
  process.exit(0);
}
mkdirSync(DESTINO, { recursive: true });
let creadas = 0;
for (const archivo of readdirSync(ORIGEN)) {
  if (!/\.(jpe?g|png|webp)$/i.test(archivo)) continue;
  const ruta = join(ORIGEN, archivo);
  const fecha = statSync(ruta).mtimeMs;
  const { width } = await sharp(ruta).metadata();
  for (const w of ANCHOS) {
    if (w >= width) continue;
    const salida = join(DESTINO, `${parse(archivo).name}-${w}.webp`);
    if (existsSync(salida) && statSync(salida).mtimeMs >= fecha) continue;
    await sharp(ruta).resize({ width: w }).webp({ quality: 72 }).toFile(salida);
    creadas++;
  }
}
console.log(`✔ Miniaturas: ${creadas} nuevas`);
