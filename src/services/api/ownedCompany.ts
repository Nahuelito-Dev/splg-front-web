import { queryClient } from '../queries/queryClient';
import { notify } from '../../utils/notifications';

/** El encabezado con el que el administrador general opera la empresa propia de la plataforma. */
export const OWNED_COMPANY_HEADER = 'X-Distributor';

/** Dónde se recuerda la empresa propia elegida (sobrevive a la recarga; se borra al cerrar sesión). */
export const OWNED_COMPANY_KEY = 'ownedCompany';

/**
 * La API ignora el `X-Distributor` cuando la empresa dejó de ser propia (desmarcada, suspendida o dada de baja): lo de
 * empresa vuelve a responder 403 con este código y el panel sale solo.
 */
export const OWNED_COMPANY_GONE_CODE = 'SUPPORT_SESSION_REQUIRED';

export const OWNED_COMPANY_ENDED_MESSAGE =
  'La empresa dejó de ser la empresa propia de la plataforma. Volviste a la vista de plataforma.';

export const OWNED_COMPANY_OTHER_TAB_EXIT = 'Saliste de la empresa propia en otra pestaña: volviste a la plataforma.';

/** La empresa propia que se está operando: lo justo para el encabezado y la marca de arriba. */
export interface OwnedCompany {
  id: string;
  slug: string;
  name: string;
}

/** Lo guardado: la empresa y el uid del administrador general que la eligió (no se hereda entre cuentas). */
export interface StoredOwnedCompany extends OwnedCompany {
  ownerUid: string;
}

const isStored = (value: unknown): value is StoredOwnedCompany => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return ['id', 'slug', 'name', 'ownerUid'].every((key) => typeof v[key] === 'string' && v[key] !== '');
};

const readRaw = (): string | null => {
  try {
    return localStorage.getItem(OWNED_COMPANY_KEY);
  } catch {
    return null;
  }
};

const parse = (raw: string | null): StoredOwnedCompany | null => {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null');
    return isStored(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const write = (value: StoredOwnedCompany | null) => {
  try {
    if (value) localStorage.setItem(OWNED_COMPANY_KEY, JSON.stringify(value));
    else localStorage.removeItem(OWNED_COMPANY_KEY);
  } catch {
    // Sin localStorage no se puede recordar la elección: el panel queda en la plataforma.
  }
};

/**
 * La fuente de verdad es `localStorage` (una sola para todas las pestañas): acá sólo se cachea lo leído para que la
 * instantánea sea estable. Si alguien borra el storage (`localStorage.clear()` del cierre de sesión), la próxima
 * lectura ya da `null`: el valor en memoria nunca sobrevive al storage.
 */
let lastRaw: string | null | undefined;
let cached: StoredOwnedCompany | null = null;
const snapshot = (): StoredOwnedCompany | null => {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    cached = parse(raw);
  }
  return cached;
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/**
 * Otra pestaña entró o salió de la empresa propia: esta se pone al día sin esperar un 403. Vacía la caché (los datos
 * de la plataforma y los de la empresa no se mezclan) y avisa a quien escucha (el layout cambia su `key`, el
 * encabezado deja de viajar o empieza a viajar).
 */
const onStorage = (event: StorageEvent) => {
  // `key === null`: la otra pestaña hizo `localStorage.clear()` (cerró sesión).
  if (event.key !== null && event.key !== OWNED_COMPANY_KEY) return;
  const before = cached;
  const after = snapshot();
  if (before?.slug === after?.slug && before?.ownerUid === after?.ownerUid) return;
  queryClient.clear();
  if (before && !after) notify.info(OWNED_COMPANY_OTHER_TAB_EXIT);
  emit();
};
if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);

const toPublic = (stored: StoredOwnedCompany | null): OwnedCompany | null =>
  stored ? { id: stored.id, slug: stored.slug, name: stored.name } : null;

/**
 * La empresa propia que opera el administrador general (sin sesión de soporte). Mientras haya una **de la cuenta que
 * está logueada**, todo pedido lleva `X-Distributor: <slug>` y la API lo trata como admin de esa empresa. Al entrar y al
 * salir se vacía la caché.
 */
export const ownedCompany = {
  /** Lo guardado, sea de quien sea (para el store; usar `getFor` para decidir). */
  getStored: (): StoredOwnedCompany | null => snapshot(),

  /** La empresa propia elegida por `uid`, o `null`. Una elegida por otra cuenta se ignora. */
  getFor: (uid: string | null | undefined): OwnedCompany | null => {
    const stored = snapshot();
    return stored && uid && stored.ownerUid === uid ? toPublic(stored) : null;
  },

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  enter: (company: OwnedCompany, ownerUid: string) => {
    write({ id: company.id, slug: company.slug, name: company.name, ownerUid });
    snapshot();
    queryClient.clear();
    emit();
  },

  /** Vuelve a la plataforma. `message`: el aviso si no lo pidió quien mira (la API cortó el acceso). */
  exit: (message?: string) => {
    if (!snapshot()) return;
    write(null);
    snapshot();
    queryClient.clear();
    if (message) notify.warn(message);
    emit();
  },

  /** La API respondió que la empresa del encabezado ya no es propia: se sale solo, con aviso. */
  endedByApi: (slug: string) => {
    if (snapshot()?.slug !== slug) return;
    ownedCompany.exit(OWNED_COMPANY_ENDED_MESSAGE);
  },

  /**
   * La identidad cambió (login de otra cuenta, cierre de sesión, falla al validar): lo guardado por otra cuenta se
   * borra, en memoria y en el storage. `uid` en `null` es «no hay nadie»: se borra siempre.
   */
  syncIdentity: (uid: string | null | undefined) => {
    const stored = snapshot();
    if (!stored || (uid && stored.ownerUid === uid)) return;
    write(null);
    snapshot();
    emit();
  },

  /** Al cerrar sesión: sin avisos y sin tocar la caché (la limpia el cierre). */
  reset: () => {
    write(null);
    snapshot();
    emit();
  },
};
