# Convenciones del panel

Mismo criterio que el back (`splg-app-backend/CONVENCIONES.md`): TypeScript
estricto sin `any`, una sola fuente de verdad para los datos y nada se da por
terminado sin probarlo contra la API corriendo. La página de **Clientes**
(`src/pages/Customers`) es la implementación de referencia: ante la duda, se
hace como ahí.

## 1. Idioma

- **Código en inglés:** archivos, componentes, hooks, funciones, variables y
  props. Es el idioma de React, de las librerías y de los nombres que vienen de
  la API (`Order`, `Customer`, `delivery_id`).
- **Castellano para lo que lee una persona:** textos de la interfaz, mensajes,
  comentarios y commits.

## 2. Estructura

```
src/
  config/env.ts            variables de entorno validadas al arrancar
  services/api/            una función por endpoint, tipada
    schema.d.ts, types.ts  generados desde el OpenAPI (npm run api:types)
    httpClient.ts          cliente autenticado, Page<T>, toPage, toQuery
    errors.ts              ApiError, toApiError, errorMessage
  services/queries/        hooks de React Query por recurso + queryKeys
  common/components/ui/    kit de componentes (Button, Modal, DataTable…)
  common/forms/            esquemas de zod compartidos (accountSchema)
  hooks/                   hooks transversales (usePermissions, useDebounce)
  utils/                   format (moneda, fechas), statusLabels, notifications
  pages/<Recurso>/         la página, sus componentes y lo que sólo usa ella
```

- Carpetas de páginas en PascalCase y en inglés, sin errores de tipeo.
- Sin barrels (`index.ts`) dentro de las páginas: se importa el archivo. El
  único barrel es el del kit (`common/components/ui`).
- Un componente por archivo. Si un archivo pasa de ~200 líneas, se parte.

## 3. Datos

- **Tipos:** siempre de `services/api/types.ts`. No se escriben interfaces a
  mano para lo que devuelve la API. Si el tipo está mal o falta, se arregla el
  Swagger del back y se regenera (`npm run api:types`).
- **Servicios** (`services/api/<recurso>.ts`): funciones que devuelven el tipo
  de la API. Sin `try/catch` que sólo loguea y vuelve a tirar, sin
  `console.log`, sin adivinar la forma de la respuesta ni inventar totales.
  Listados con total: `toPage()` (lee `X-Total-Count`).
- **Hooks** (`services/queries/<recurso>.ts`): `useX(params)`, `useXDetail(id)`,
  `useCreateX()`, `useUpdateX()`, `useDeleteX()`. Las claves salen de
  `queryKeys`; cada mutación invalida `queryKeys.<recurso>.all`.
- **Las páginas no llaman a servicios ni a `useQuery` directo**: usan los hooks.
- Cuerpos que se mandan: tipados con el `...Body` del DTO, y sólo con los campos
  que acepta (la API rechaza cualquier campo de más).

## 4. Componentes

- Componentes de función con props tipadas (`interface Props`). Nada de
  `React.FC` ni `any` en props o eventos.
- Estado derivado se calcula, no se copia a `useState`. `useEffect` sólo para
  sincronizar con algo externo (resetear un formulario al abrir, etc.).
- Listas con `key` estable (el id), nunca el índice.
- `useMemo`/`useCallback` sólo donde hay un costo o una identidad que importa
  (columnas de una tabla, dependencias de un efecto).
- Nada de estilos inline para colores; nada de `document.querySelector`.

## 5. Formularios

- `react-hook-form` + `zod` (`zodResolver`). El esquema repite las reglas del
  DTO del back; las reglas de cuenta están en `common/forms/accountSchema.ts`.
- Campos del kit (`Input`, `Select`, `TextArea`, `Checkbox`): traen etiqueta
  asociada, error anunciado (`role="alert"`) y `aria-invalid`.
- **Campos conectados:** `<Form methods={methods} onSubmit={onSubmit} id="…">` (pone el
  `id` y `noValidate`) con `FormInput`, `FormSelect`, `FormTextArea` y `FormCheckbox`
  (las fechas son `FormInput type="date"`). Leen `name` del contexto y sacan el error
  del `formState`: no se escribe `error={errors.x?.message}` ni `{...register('x')}`.
  `registerOptions` pasa `valueAsNumber` y similares. `onSubmit` recibe los valores ya
  validados (no se envuelve en `handleSubmit`).
- El botón de enviar muestra `loading` con `mutation.isPending`.

## 6. Interfaz

- **Paleta:** sólo los tokens de `tailwind.config.js` (`primary`, `ink`,
  `muted`, `outline`, `bg`, `surface`, `success`, `danger`, `warn`, `info`,
  y las escalas `llama`, `gas`, `tinta`). Ni `indigo-600` ni `#f43f5e`:
  `npm run colors` falla si aparece uno.
- **Kit:** `PageHeader` (un solo `h1` por página; en las fichas, con `breadcrumbs`
  en lugar de un botón «volver» suelto), `Card`, `Button`,
  `IconButton` (con `label` obligatorio), `Badge` (con `labelOf` de
  `statusLabels`), `DataTable`, `Modal`, `SearchInput`, `EmptyState`,
  `LoadingState`, `ErrorState`.
- **Contenedor y encabezados:** cada página va en `PageContainer` (`size` `sm|md|lg|xl|full`,
  `lg` por defecto; `stack` separa los bloques), no en un `div` con `mx-auto max-w-*`.
  Las tarjetas de una ficha abren con `CardHeader` (título, `subtitle`, `icon`, `badge`,
  `action`); no se arma el `h2` a mano. `PageHeader` pone la acción primaria en `actions`
  y las demás en `secondaryActions` (`{ label, icon, onClick, tone, blockedReason }`): con
  una se ve como botón y con dos o más (3 en total) van en el menú ⋮ «Más acciones».
- **Barra de un listado:** `TableToolbar` (`filters` con selects y `DateRangeFilter`,
  `search` que ocupa el resto, `csv` / `actions` en el menú ⋮ «Más», y debajo los chips o
  «N resultados»). Las fechas de un filtro son `DateRangeFilter` (o `DateRangePicker`),
  no un par de `type="date"`. Los chips dicen el filtro («Estado: Bloqueado», «Búsqueda:
  "juan"»): `FilterChips` deduce el nombre de `key` (`chipText`) o se pasa `name`.
- **Densidad:** `DataTable` trae el interruptor «Denso» en el pie (filas de 60 a 44 px);
  se recuerda por dispositivo (`TABLE_DENSE_KEY`).
- **Estilos de MUI:** menús, popovers, diálogos, paneles, fondo, casillas y la grilla se
  estilan una vez en `theme/components/*` leyendo `brand.json`. En el componente no van
  clases con `!` para pelear con MUI; sólo posición (`!mt-2`, `!w-[260px]`).
- **Patrones de listado:** `Tabs` con contador (la cantidad sale de la API:
  `X-Total-Count` con una página mínima, o los endpoints de stats; sin dato es un
  guion, nunca 0), `FilterChips` con `resultCount` («N resultados» y limpiar),
  `AnalyticSummary` (anillo por estado) sobre Pedidos y Reclamos, y los filtros en
  la URL con `useUrlParam` / `useUrlParams` (varios de golpe, para que no se pisen).
  Un vacío con filtros activos es «Sin resultados» (`illustration="search"`), no el
  vacío del recurso.
- **Detalle sin salir de la lista:** `Drawer` (panel lateral, `aria-modal`, foco
  atrapado, Esc) para Reclamos, Incidencias, Auditoría y Reservas; `Modal` queda para
  formularios y confirmaciones.
- **Fichas:** `PageHeader` + `PageCover` (portada, avatar, KPIs) + `ProfileTabs` con la
  pestaña en la URL (`useProfileTab`). Mientras carga, `ProfileSkeleton` /
  `DetailSkeleton`; en tablas, `TableSkeleton` / `ListSkeleton` (no el spinner).
- **Selección múltiple:** `DataTable` con `selection` + `SelectionBar`. La API no tiene
  endpoints en lote: la acción corre una llamada por fila con `runBatch`
  (`utils/batch`), sin cortar en la primera falla, y se resume «X de N … Fallaron M».
- **Formato:** moneda y fechas con `utils/format` (es-AR). Estados con
  `utils/statusLabels`: nunca un `switch` de colores dentro de un componente.
- **Avisos:** `notify.success/error` (toasts) y `confirm({ danger: true })`
  antes de cualquier acción destructiva (un `Dialog` de MUI con promesa, dibujado por
  `ConfirmDialogHost`, montado una vez en `App`; en una baja el foco arranca en Cancelar).
  No `alert`.
- **Permisos:** `usePermissions()`. Lo que el rol no puede hacer no se muestra
  (la API igual lo rechaza).
- **Distribuidora activa:** el administrador general sin "Ver como" no puede
  crear ni editar datos de una empresa (la API contesta 400). Las altas usan
  `disabled={!canWrite}` con `title={writeHint}` y las acciones de fila se
  pasan sólo si `canWrite` (las tablas no dibujan el botón sin su callback).
  La distribuidora se lee y se guarda sólo con `services/api/activeDistributor`.
- **Accesibilidad:** botones con `type`, íconos solos con nombre accesible,
  foco visible, textos alternativos, contraste AA (la paleta ya lo cumple).

## 7. Formato

Prettier con la configuración del proyecto (`.prettierrc.json`: comillas simples,
120 columnas). `npm run format` formatea; `npm run format:check` lo verifica y
forma parte de `npm run verify`. Nunca `npx prettier` sin la dependencia del
proyecto: aplica otros valores por defecto.

## 8. Página terminada

Una página está lista cuando cumple las ocho:

1. `npm run typecheck` y `npm run lint` en 0 en sus archivos.
2. Cero `any`, cero `as` innecesarios, cero `console.log`.
3. Datos por hooks de `services/queries`, tipos de `types.ts`.
4. Componentes del kit; sin duplicar lo que el kit ya resuelve.
5. `npm run colors` en verde en sus archivos.
6. Textos en castellano, código en inglés.
7. Probada en el navegador contra la API corriendo: listar, buscar, crear,
   editar, borrar y los permisos por rol, lo que la página tenga.
8. `npm run verify` completo en verde antes de commitear.
