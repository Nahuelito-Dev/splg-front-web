# splg-app-admin

Panel web de SPLG (admin de distribuidora y superadmin). React + Vite + TypeScript +
React Query 5 + MUI/Tailwind + zod. Mapa del sistema y reglas del workspace: `../AGENTS.md`.

<!-- orq:gate: npm run verify -->

## Comandos

| Para | Comando |
|---|---|
| Gate completo | `npm run verify` — typecheck, lint (0 warnings), prettier, colores, vitest y build |
| Desarrollo | `npm run dev` (:3001, contra el back de :3000) |
| Contra otro back | `VITE_APP_API_URL=http://localhost:3100/api VITE_APP_SOCKET_URL=http://localhost:3100 npx vite --port 3001` |
| Tipos de la API | bajar `/docs-json` del back a `openapi/splg-api.json` (indent 4) y `npm run api:types` |
| Colores fuera de la marca | `npm run colors` |

Login: `admin@splg.com` / `Test1234` o `superadmin@splg.com`.

## Convenciones

**`CONVENCIONES.md` manda.** Código en inglés, textos de interfaz y commits en castellano.
La página de **Clientes** (`src/pages/Customers`) es la implementación de referencia: ante
la duda, se hace como ahí.

- Datos sólo por `services/api` (una función tipada por endpoint) + hooks de
  `services/queries` con `queryKeys`. Nada de `fetch`/`axios` sueltos en componentes.
- Tipos de la API generados, nunca escritos a mano.
- Componentes del kit `common/components/ui`; tablas de 4–5 columnas con `IdentityCell` +
  `RowActions` y el resto en el detalle.
- Colores sólo de `src/theme/brand.json` (sistema Brasa). `npm run colors` lo controla.
- Un endpoint del back que el panel no usa, o una pantalla que llama algo que el back no
  tiene, no cuenta como entregado.

## Cómo se da por hecho

`npm run verify` en verde **y** la pantalla recorrida en Chrome contra la API corriendo,
con la paleta Brasa, en escritorio y a 320 px. Ver `~/.claude/orquesta/DOD.md`.
