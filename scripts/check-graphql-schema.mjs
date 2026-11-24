// Controla que la copia del esquema GraphQL del panel (`graphql/splg-api.graphql`) sea la del back
// (`src/graphql/esquema.graphql`, que genera `npm run graphql:esquema`). Busca el back al lado:
//   SPLG_BACKEND_DIR, ../splg-app-backend (checkout del workspace) o ../../splg-app-backend/<mismo worktree>.
// Sin el back al lado (CI, otra máquina) no falla: avisa y sigue.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const raiz = process.cwd();
const ESQUEMA_DEL_BACK = 'src/graphql/esquema.graphql';
const candidatos = [
  process.env.SPLG_BACKEND_DIR,
  resolve(raiz, '..', 'splg-app-backend'),
  resolve(raiz, '..', '..', 'splg-app-backend', basename(raiz)),
].filter(Boolean);

const back = candidatos.map((d) => join(d, ESQUEMA_DEL_BACK)).find((f) => existsSync(f));
if (!back) {
  console.log('graphql:check: no hay un back al lado; no se compara el esquema.');
  process.exit(0);
}
const copia = readFileSync(join(raiz, 'graphql/splg-api.graphql'), 'utf8');
if (copia !== readFileSync(back, 'utf8')) {
  console.error(
    `graphql:check: graphql/splg-api.graphql no coincide con ${back}.\n` +
      'Copiá el esquema del back y corré npm run graphql:types.',
  );
  process.exit(1);
}
console.log(`graphql:check: el esquema coincide con ${back}.`);
