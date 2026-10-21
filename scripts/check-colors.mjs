// Falla si un componente usa colores fuera de la paleta de marca: paletas
// sueltas de Tailwind (indigo-600, slate-200…) o hex escritos a mano.
// Los valores viven en src/theme/brand.json (ver MARCA.md en splg-docs).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PALETAS =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const CLASE = new RegExp(
  `\\b(?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|shadow|decoration|accent|caret)-(?:${PALETAS})-\\d{2,3}\\b`,
  'g',
);
const HEX = /['"`]#[0-9a-fA-F]{3,8}['"`]|\[#[0-9a-fA-F]{3,8}\]/g;
const RGB = /\brgba?\(\s*\d/g;
// El tema define los colores (brand.json, muiTheme.ts); sus overrides de componentes se revisan como el resto.
const EXENTOS = [join('src', 'theme')];
const REVISADOS = [join('src', 'theme', 'components')];

const archivos = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    // Los tests no son interfaz: pueden usar hex como datos de prueba.
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|css)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });

const fallas = [];
for (const archivo of archivos('src')) {
  if (EXENTOS.some((e) => archivo.startsWith(e)) && !REVISADOS.some((r) => archivo.startsWith(r))) continue;
  readFileSync(archivo, 'utf8')
    .split('\n')
    .forEach((linea, i) => {
      const rgb = REVISADOS.some((r) => archivo.startsWith(r)) ? [...linea.matchAll(RGB)] : [];
      for (const m of [...linea.matchAll(CLASE), ...linea.matchAll(HEX), ...rgb]) fallas.push(`${archivo}:${i + 1}  ${m[0]}`);
    });
}
if (fallas.length) {
  console.error(fallas.join('\n'));
  console.error(
    `\n${fallas.length} colores fuera de la paleta. Usá los tokens de tailwind.config.js (primary, ink, muted, outline, llama-*, gas-*, tinta-*…).`,
  );
  process.exit(1);
}
console.log('colores: todo con la paleta de marca');
