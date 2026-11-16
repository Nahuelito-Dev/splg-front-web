import { useSyncExternalStore } from 'react';

/** Cómo anda Google Maps en esta pestaña: una vez que rechaza la clave o no carga, todos los mapas lo avisan. */
export type MapsStatus = 'ok' | 'auth-failed' | 'load-failed';

let status: MapsStatus = 'ok';
const listeners = new Set<() => void>();

const set = (next: MapsStatus) => {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
};

/** Google llama a `gm_authFailure` cuando rechaza la clave; sin esto dibuja su recuadro gris «algo salió mal». */
window.gm_authFailure = () => set('auth-failed');

export const reportMapsLoadError = () => set('load-failed');

export const mapsStatusStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => status,
  /** Sólo para los tests: vuelve al estado inicial. */
  reset: () => set('ok'),
};

export const useMapsStatus = () => useSyncExternalStore(mapsStatusStore.subscribe, mapsStatusStore.getSnapshot);
