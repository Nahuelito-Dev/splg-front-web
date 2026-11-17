/**
 * Después de publicar una versión nueva, una pestaña abierta con la anterior pide pantallas (archivos con hash)
 * que ya no existen y React muestra «Failed to fetch dynamically imported module». Vite avisa con
 * `vite:preloadError`: se recarga la página una sola vez para traer la versión nueva. Si en los últimos
 * `WINDOW_MS` ya se recargó por esto, no se insiste (evita un bucle si el archivo falta de verdad).
 */
const KEY = 'splg:new-version-reload-at';
const WINDOW_MS = 60_000;

interface ReloadDeps {
  target: Pick<Window, 'addEventListener'>;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  reload: () => void;
  now: () => number;
}

export const installNewVersionReload = ({ target, storage, reload, now }: ReloadDeps): void => {
  target.addEventListener('vite:preloadError', (event: Event) => {
    let last: number | null = null;
    try {
      const raw = storage?.getItem(KEY);
      last = raw ? Number(raw) : null;
    } catch {
      last = null;
    }
    if (last !== null && now() - last < WINDOW_MS) return;
    try {
      storage?.setItem(KEY, String(now()));
    } catch {
      // Sin almacenamiento igual se recarga una vez: el peor caso es otra recarga si vuelve a fallar.
    }
    event.preventDefault();
    reload();
  });
};
