// Genera los tipos del panel a partir del OpenAPI de la API (fuente única).
//   npm run api:types
// 1. openapi-typescript → src/services/api/schema.d.ts (no se edita a mano).
// 2. src/services/api/types.ts: un alias legible por cada DTO. Los que viajan
//    como cuerpo de un pedido llevan el sufijo `Body`; las respuestas, el nombre
//    del recurso (OrderResponseDto → Order).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SPEC = 'openapi/splg-api.json';
execSync(`npx openapi-typescript ${SPEC} -o src/services/api/schema.d.ts`, { stdio: 'inherit' });
// .prettierignore lo excluye del formato del panel; se formatea igual para que el diff sea sólo el cambio real.
execSync('npx prettier --write --ignore-path /dev/null src/services/api/schema.d.ts', { stdio: 'inherit' });

const spec = JSON.parse(readFileSync(SPEC, 'utf8'));
const esquemas = Object.keys(spec.components.schemas).sort();
const refs = (obj, out = new Set()) => {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k === '$ref' && typeof v === 'string') out.add(v.split('/').pop());
      else refs(v, out);
    }
  }
  return out;
};
const deEntrada = new Set();
for (const ops of Object.values(spec.paths)) for (const op of Object.values(ops)) refs(op.requestBody ?? {}, deEntrada);
// Lo anidado dentro de un cuerpo también es de entrada (OrderItemDto va dentro
// de CreateOrderDto).
for (let cambio = true; cambio;) {
  cambio = false;
  for (const n of [...deEntrada])
    for (const r of refs(spec.components.schemas[n] ?? {}))
      if (!deEntrada.has(r)) {
        deEntrada.add(r);
        cambio = true;
      }
}

const alias = (nombre) =>
  deEntrada.has(nombre) ? nombre.replace(/Dto$/, 'Body') : nombre.replace(/ResponseDto$|Dto$/, '');
// Un esquema nuevo no le cambia el significado a un alias que el panel ya usa: ante un choque (MessageDto y
// MessageResponseDto dan los dos `Message`), el alias corto queda para el que ya lo tenía en types.ts.
const previos = new Map();
try {
  for (const [, a, n] of readFileSync('src/services/api/types.ts', 'utf8').matchAll(/export type (\w+) = S\['(\w+)'\];/g))
    previos.set(n, a);
} catch {
  // primera generación: no hay alias previos
}
const usados = new Map();
const nombres = new Map();
const yaTenian = esquemas.filter((n) => previos.get(n) === alias(n));
for (const n of [...yaTenian, ...esquemas.filter((n) => !yaTenian.includes(n))]) {
  let a = alias(n);
  if (usados.has(a)) a = n; // choque: se deja el nombre original
  usados.set(a, n);
  nombres.set(n, a);
}
const lineas = esquemas.map((n) => `export type ${nombres.get(n)} = S['${n}'];`);

writeFileSync(
  'src/services/api/types.ts',
  `// Generado por scripts/generate-types.mjs a partir de ${SPEC}. No editar a mano.
import type { components } from './schema';

type S = components['schemas'];

${lineas.join('\n')}
`,
);
console.log(`types.ts: ${lineas.length} alias (${deEntrada.size} de entrada)`);
