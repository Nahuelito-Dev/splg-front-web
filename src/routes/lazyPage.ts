import { lazy, type ComponentType } from 'react';

/**
 * `React.lazy` para páginas con export nombrado: el panel no usa default
 * exports, así que se adapta el módulo a la forma que espera `lazy`.
 */
export const lazyPage = <M extends Record<K, ComponentType>, K extends keyof M & string>(
  load: () => Promise<M>,
  name: K,
) => lazy(async () => ({ default: (await load())[name] }));
