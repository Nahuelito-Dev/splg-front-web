import type { Breadcrumb, BrowserOptions, ErrorEvent } from '@sentry/react';

/** El SDK no exporta el tipo de las transacciones: se toma del parámetro de `beforeSendTransaction`. */
type TransactionEvent = Parameters<NonNullable<BrowserOptions['beforeSendTransaction']>>[0];

/**
 * Filtro de datos personales de lo que sale hacia Sentry. Se aplica en `beforeSend`, `beforeSendTransaction` y
 * `beforeBreadcrumb`: tokens, `Authorization`, correos, teléfonos, DNI/CUIT y la query de las URL nunca salen del
 * navegador. Ante la duda se tapa de más: un dato de menos en Sentry se pide al usuario, uno de más no se borra.
 */

/** Claves que se tapan enteras sin mirar el valor (encabezados, cuerpos, `extra`, datos de un breadcrumb). */
const SENSITIVE_KEY =
  /authorization|cookie|token|password|secret|signature|e-?mail|phone|tel[eé]fono|dni|cuit|cuil|celular|full_?name|address|direcci[oó]n/i;

const FILTERED = '[filtrado]';

/** Orden: lo más específico primero (un JWT o un CUIT se tapan antes de que el de teléfono los parta). */
const PATTERNS: readonly [RegExp, string][] = [
  [/Bearer\s+[^\s"',;]+/gi, 'Bearer [token]'],
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]'],
  [/[\w.%+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi, '[email]'],
  [/(?<![\w-])\d{2}-\d{8}-\d(?![\w-])/g, '[cuit]'],
  [/\+\d[\d\s-]{7,16}\d(?![\w-])/g, '[teléfono]'],
  [/(?<![\w.-])\d{2,5}[\s-]\d{3,4}[\s-]?\d{4}(?![\w-])/g, '[teléfono]'],
  [/(?<![\w.-])\d{10,11}(?![\w-]|\.\d)/g, '[teléfono]'],
  [/(?<![\w.-])\d{1,2}\.?\d{3}\.?\d{3}(?![\w-]|\.\d)/g, '[dni]'],
];

/** La query y el fragmento de toda URL que aparezca en un texto. */
const URL_WITH_QUERY = /(\b[a-z][a-z\d+.-]*:\/\/[^\s?#"'<>]*|(?<![\w?])\/[^\s?#"'<>]*)[?#][^\s"'<>]*/gi;

/** Un texto libre (mensaje, valor de excepción, URL) sin datos personales ni query. */
export const scrubText = (text: string): string =>
  PATTERNS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    text.replace(URL_WITH_QUERY, '$1'),
  );

/** Una URL sin query ni fragmento, y con lo que quede de personal (un correo en el path) tapado. */
export const scrubUrl = (url: string): string => scrubText(url.split(/[?#]/, 1)[0] ?? '');

const MAX_DEPTH = 6;

/** Recorre un objeto (encabezados, `extra`, `contexts`, datos de breadcrumbs) y tapa claves sensibles y textos. */
export const scrubValue = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') return scrubText(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return FILTERED;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) out[key] = FILTERED;
    else if (key === 'url' && typeof item === 'string') out[key] = scrubUrl(item);
    else out[key] = scrubValue(item, depth + 1);
  }
  return out;
};

const scrubRecord = <T>(value: T | undefined): T | undefined =>
  value === undefined ? undefined : (scrubValue(value) as T);

/**
 * Atributos del selector con el que Sentry describe un elemento (`button.btn[aria-label="Juan Pérez"][title="…"]`):
 * `aria-label`, `title`, `alt` y `name` suelen llevar nombres de clientes o de archivos. Queda tag, id y clases.
 */
const ATTRIBUTE_SELECTOR = /\[[\w:-]+(?:="[^"]*")?\]/g;

export const scrubDomTarget = (target: string): string => scrubText(target.replace(ATTRIBUTE_SELECTOR, ''));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** El nodo que Replay adjunta a un click: sin texto y sólo con `id` y `class` de sus atributos. */
const scrubDomNode = (node: unknown): unknown => {
  if (!isRecord(node)) return undefined;
  const attributes = isRecord(node.attributes) ? node.attributes : {};
  return {
    id: node.id,
    tagName: node.tagName,
    attributes: {
      ...(typeof attributes.id === 'string' ? { id: scrubText(attributes.id) } : {}),
      ...(typeof attributes.class === 'string' ? { class: scrubText(attributes.class) } : {}),
    },
  };
};

const scrubDomData = (data: Breadcrumb['data']): Breadcrumb['data'] => {
  if (!data) return data;
  const out: Record<string, unknown> = {};
  if (typeof data['ui.component_name'] === 'string') out['ui.component_name'] = data['ui.component_name'];
  if (typeof data.nodeId === 'number') out.nodeId = data.nodeId;
  if (data.node !== undefined) out.node = scrubDomNode(data.node);
  return out;
};

/** Consola: sin argumentos (pueden ser objetos enteros de la API); queda el nivel y el primer texto, filtrado. */
const scrubConsole = (breadcrumb: Breadcrumb): Breadcrumb => {
  const args: unknown = breadcrumb.data?.arguments;
  const first: unknown = Array.isArray(args) ? args[0] : breadcrumb.message;
  return {
    ...breadcrumb,
    message: typeof first === 'string' ? scrubText(first) : FILTERED,
    data: { logger: 'console' },
  };
};

export const scrubBreadcrumb = <B extends Breadcrumb>(breadcrumb: B): B => {
  if (breadcrumb.category === 'console') return scrubConsole(breadcrumb) as B;
  if (breadcrumb.category?.startsWith('ui.')) {
    return {
      ...breadcrumb,
      message: breadcrumb.message === undefined ? undefined : scrubDomTarget(breadcrumb.message),
      data: scrubDomData(breadcrumb.data),
    };
  }
  return {
    ...breadcrumb,
    message: breadcrumb.message === undefined ? undefined : scrubText(breadcrumb.message),
    data: scrubRecord(breadcrumb.data),
  };
};

/** Lo común a errores y transacciones: request, usuario, breadcrumbs, `extra`, `contexts` y tags. */
const scrubCommon = <E extends ErrorEvent | TransactionEvent>(event: E): E => {
  const scrubbed: E = { ...event };
  if (event.message) scrubbed.message = scrubText(event.message);
  if (event.transaction) scrubbed.transaction = scrubText(event.transaction);
  if (event.request) {
    // Se arma de nuevo con lo que sirve: la query (`query_string`), las cookies y el `env` no salen.
    const { url, method, headers, data } = event.request;
    scrubbed.request = {
      ...(method === undefined ? {} : { method }),
      ...(url === undefined ? {} : { url: scrubUrl(url) }),
      ...(headers === undefined ? {} : { headers: scrubValue(headers) as Record<string, string> }),
      ...(data === undefined ? {} : { data: scrubValue(data) }),
    };
  }
  // Sólo el id interno: ni correo, ni nombre, ni IP.
  if (event.user) scrubbed.user = event.user.id === undefined ? undefined : { id: event.user.id };
  if (event.breadcrumbs) scrubbed.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  scrubbed.extra = scrubRecord(event.extra);
  scrubbed.contexts = scrubRecord(event.contexts);
  scrubbed.tags = scrubRecord(event.tags);
  return scrubbed;
};

export const scrubErrorEvent = (event: ErrorEvent): ErrorEvent => {
  const scrubbed = scrubCommon(event);
  if (event.exception?.values) {
    scrubbed.exception = {
      ...event.exception,
      values: event.exception.values.map((exception) => ({
        ...exception,
        ...(exception.value === undefined ? {} : { value: scrubText(exception.value) }),
      })),
    };
  }
  if (event.logentry?.message) {
    scrubbed.logentry = { ...event.logentry, message: scrubText(event.logentry.message), params: [] };
  }
  return scrubbed;
};

export const scrubTransactionEvent = (event: TransactionEvent): TransactionEvent => {
  const scrubbed = scrubCommon(event);
  if (event.spans) {
    scrubbed.spans = event.spans.map((span) => ({
      ...span,
      ...(span.description === undefined ? {} : { description: scrubText(span.description) }),
      data: scrubValue(span.data) as typeof span.data,
    }));
  }
  return scrubbed;
};
