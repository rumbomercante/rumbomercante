import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const leer = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const { url } = leer('./src/data/seo.json');

// Color de acento elegido en el panel: se aplica a los archivos ya generados.
const PALETAS = {
  cobre: ['#e8a07a', '232, 160, 122', '#f3c4a8', '#8f4f2e'],
  turquesa: ['#7fd3c8', '127, 211, 200', '#b4e6df', '#1f6f66'],
  plata: ['#d5dde6', '213, 221, 230', '#e8edf2', '#5a6b7e'],
};
const paleta = () => ({
  name: 'paleta-de-acento',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const p = PALETAS[leer('./src/data/apariencia.json').acento];
      if (!p) return;
      const recorrer = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
        const f = path.join(d, e.name);
        if (e.isDirectory()) return recorrer(f);
        if (!/\.(css|html)$/.test(e.name)) return;
        fs.writeFileSync(f, fs.readFileSync(f, 'utf8')
          .replace(/#f0c27a/gi, p[0]).replace(/240,\s*194,\s*122/g, p[1])
          .replace(/#f6d6a2/gi, p[2]).replace(/#8a6220/gi, p[3]));
      });
      recorrer(fileURLToPath(dir));
    },
  },
});

export default defineConfig({
  site: url,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'file', assets: '_assets' },
  integrations: [paleta()],
});
