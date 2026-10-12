/** Clave de idempotencia (UUID v4). */
export const newIdempotencyKey = (): string => crypto.randomUUID();

/** Cabeceras de un pedido que mueve stock. */
export const idempotencyHeaders = (key: string) => ({ 'Idempotency-Key': key });

/** Serialización estable (claves ordenadas): dos cuerpos iguales dan la misma huella aunque cambie el orden. */
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

/**
 * Claves de las intenciones en curso, sólo en memoria (nunca en localStorage): una por operación y entidad
 * (`transfer:new`, `void:<id>`, `close:<id>`…), atada a la huella del cuerpo que se mandó.
 */
const intents = new Map<string, { fingerprint: string; key: string }>();

/**
 * La clave de una intención. Si el formulario se cierra tras un error y se reabre con los mismos datos, es la misma
 * clave (un reintento no duplica); si cambian los datos es otra intención y otra clave (con la misma, el back
 * respondería 422 o devolvería la respuesta guardada).
 */
export const intentKey = (scope: string, body: unknown): string => {
  const fingerprint = stable(body);
  const current = intents.get(scope);
  if (current?.fingerprint === fingerprint) return current.key;
  const key = newIdempotencyKey();
  intents.set(scope, { fingerprint, key });
  return key;
};

/** La intención terminó (salió bien o el back la rechazó por completo): la próxima será otra. */
export const clearIntent = (scope: string): void => {
  intents.delete(scope);
};
