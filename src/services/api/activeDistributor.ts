const KEY = 'selectedDistributor';

/**
 * La distribuidora que el administrador general eligió con "Ver como". Viaja
 * en el header X-Distributor; sin ella, la API le rechaza toda alta (400). Un
 * admin de empresa no la usa: la API lo acota por su token. Cambiarla recarga
 * el panel, así que leerla al renderizar alcanza.
 */
export const activeDistributor = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (slug: string | null) => {
    if (slug) localStorage.setItem(KEY, slug);
    else localStorage.removeItem(KEY);
  },
};
