import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { RouterProvider, createMemoryRouter, createRoutesFromElements } from 'react-router-dom';

type InitialEntry = NonNullable<Parameters<typeof createMemoryRouter>[1]>['initialEntries'] extends
  (infer E)[] | undefined
  ? E
  : never;

/**
 * Dibuja `<Route>`s en un router de datos en memoria, como lo monta la app (`createBrowserRouter`): hace falta para lo
 * que usa `useBlocker`. Devuelve el `router` para navegar (`router.navigate(-1)` es el botón «Atrás»).
 */
export const renderRoutes = (routes: ReactNode, entries: InitialEntry[]) => {
  const router = createMemoryRouter(createRoutesFromElements(routes), { initialEntries: entries });
  return { router, ...render(<RouterProvider router={router} />) };
};
