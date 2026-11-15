// Falla si un componente usa colores fuera de la paleta de marca: paletas
// sueltas de Tailwind (indigo-600, slate-200…) o hex escritos a mano.
// Los valores viven en src/theme/brand.json (ver MARCA.md en splg-docs).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PALETAS =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const CLASE = new RegExp(
  `\\b(?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|shadow|decoration|accent|caret)-(?:${PALETAS})-\\d{2,3}\\b`,
  'g',
);
const HEX = /['"`]#[0-9a-fA-F]{3,8}['"`]|\[#[0-9a-fA-F]{3,8}\]/g;
const RGB = /\brgba?\(\s*\d/g;
const ESCALAS_DE_MARCA =
  /\b(?:[a-z-]+:)*(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|shadow|decoration|accent|caret)-(?:llama|gas)-\d{2,3}\b/g;
const THEME_ESCALAS_DE_MARCA = /theme\(\s*['"]?colors\.(?:llama|gas)(?:\.\d{2,3})?(?:\s*\/[^)]*)?['"]?\s*\)/g;
const IMPORTA_MARCA =
  /\bimport\s+(?:(?:\*\s+as\s+)?brand|\{[^}]*\b(?:llama|gas)\b[^}]*\})\s+from\s+['"][^'"]*brand\.json['"]/g;
const ESCALA_DE_OBJETO_MARCA = /\bbrand\.(?:llama|gas)\b/g;
// El tema define los colores (brand.json, muiTheme.ts); sus overrides de componentes se revisan como el resto.
const EXENTOS = [join('src', 'theme')];
const REVISADOS = [join('src', 'theme', 'components')];

const archivos = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    // Los tests no son interfaz: pueden usar hex como datos de prueba.
    return statSync(p).isDirectory() ? archivos(p) : /\.(tsx?|css)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });

export const checkColors = (sourceRoot = 'src') => {
  const fallas = [];
  for (const archivo of archivos(sourceRoot)) {
    const relativo = sourceRoot === 'src' ? archivo : join('src', archivo.slice(sourceRoot.length + 1));
    if (EXENTOS.some((e) => relativo.startsWith(e)) && !REVISADOS.some((r) => relativo.startsWith(r))) continue;
    readFileSync(archivo, 'utf8')
      .split('\n')
      .forEach((linea, i) => {
        const rgb = REVISADOS.some((r) => relativo.startsWith(r)) ? [...linea.matchAll(RGB)] : [];
        const escalasDeMarca = relativo.startsWith(join('src', 'theme'))
          ? []
          : [...linea.matchAll(IMPORTA_MARCA), ...linea.matchAll(ESCALA_DE_OBJETO_MARCA)];
        for (const m of [
          ...linea.matchAll(CLASE),
          ...linea.matchAll(HEX),
          ...linea.matchAll(ESCALAS_DE_MARCA),
          ...linea.matchAll(THEME_ESCALAS_DE_MARCA),
          ...escalasDeMarca,
          ...rgb,
        ]) {
          fallas.push(`${relativo}:${i + 1}  ${m[0]}`);
        }
      });
  }
  return fallas;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fallas = checkColors();
  if (fallas.length) {
    console.error(fallas.join('\n'));
    console.error(
      `\n${fallas.length} colores fuera de la paleta. Usá los roles de tailwind.config.js (primary, accent, ink, muted, outline…).`,
    );
    process.exit(1);
  }
  console.log('colores: todo con la paleta de marca');
}
