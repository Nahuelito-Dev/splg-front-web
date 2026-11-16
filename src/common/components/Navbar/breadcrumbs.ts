import { formatShortId } from '../../../utils/format';
import { NAV_SECTIONS } from '../sidemenu/navConfig';

export interface Crumb {
  label: string;
  /** Sin `to`, la miga es sólo texto (la sección, o la página actual). */
  to?: string;
}

const ACCOUNT_PATH = '/account';

/**
 * Las migas de una ruta, derivadas del menú: sección › pantalla › (nuevo | detalle).
 * Nada se inventa: el detalle de un pedido muestra su id corto, que sale de la URL;
 * el de lo demás, «Detalle», porque el nombre viene de la API y la barra no lo pide.
 */
export const buildBreadcrumbs = (pathname: string): Crumb[] => {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === ACCOUNT_PATH) return [{ label: 'Mi cuenta' }];

  let best: { section: string; title: string; path: string } | null = null;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const matches = path === item.path || path.startsWith(`${item.path}/`);
      if (matches && (!best || item.path.length > best.path.length)) {
        best = { section: section.title, title: item.title, path: item.path };
      }
    }
  }
  if (!best) return [];

  const rest = path
    .slice(best.path.length)
    .split('/')
    .filter((segment) => segment && segment !== 'details');
  const crumbs: Crumb[] = [{ label: best.section }];
  if (rest.length === 0) return [...crumbs, { label: best.title }];

  const leaf = rest[0] === 'new' ? 'Nuevo' : best.path === '/orders' ? formatShortId(rest[0]) : 'Detalle';
  return [...crumbs, { label: best.title, to: best.path }, { label: leaf }];
};
