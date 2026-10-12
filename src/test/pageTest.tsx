import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** Resultado de una consulta de React Query ya resuelta. */
export const ok = <T,>(data: T, over: Record<string, unknown> = {}) => ({
  data,
  error: null,
  isPending: false,
  isFetching: false,
  isError: false,
  isSuccess: true,
  refetch: vi.fn(),
  ...over,
});

/** Consulta que falló: el esqueleto del error y su `refetch` para «Reintentar». */
export const failed = (refetch = vi.fn()) => ({
  data: undefined,
  error: new Error('boom'),
  isPending: false,
  isFetching: false,
  isError: true,
  isSuccess: false,
  refetch,
});

/** Consulta que todavía no respondió. */
export const loading = () => ({
  data: undefined,
  error: null,
  isPending: true,
  isFetching: true,
  isError: false,
  isSuccess: false,
  refetch: vi.fn(),
});

/** Mutación de React Query en reposo. */
export const mutation = (over: Record<string, unknown> = {}) => ({
  mutate: vi.fn<[unknown, unknown?], void>(),
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  ...over,
});

/** Una página de las que devuelve la API: `{ data, total }`. */
export const pageOf = <T,>(rows: T[], total = rows.length) => ({ data: rows, total });

/** Dibuja la página en su ruta, como la monta el router de la app. */
export const renderPage = (ui: ReactElement, { url = '/', path }: { url?: string; path?: string } = {}) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path={path ?? url.split('?')[0]} element={ui} />
        <Route path="*" element={<p>otra ruta</p>} />
      </Routes>
    </MemoryRouter>,
  );

interface ListCase {
  /** Nombre de la pantalla. */
  name: string;
  url: string;
  /** La pantalla; los hooks ya están mockeados en el archivo del test. */
  page: ReactElement;
  /** Le da a los hooks lo que tienen que devolver. */
  setResult: (result: ReturnType<typeof ok> | ReturnType<typeof failed> | ReturnType<typeof loading>) => void;
  /** Lo que devuelve la consulta con una fila. */
  withRow: () => ReturnType<typeof ok>;
  /** Lo que devuelve la consulta sin filas. */
  withoutRows: () => ReturnType<typeof ok>;
  /** Texto que sale de la fila. */
  rowText: string;
  /** Texto del estado vacío. */
  emptyText: string;
  loadingLabel: string;
}

/** Los cuatro estados de una pantalla de lista: carga, con datos, vacía y error del back (con «Reintentar»). */
export const describeListStates = (c: ListCase) =>
  describe(`${c.name}: estados de la lista`, () => {
    afterEach(() => {
      cleanup();
      vi.clearAllMocks();
    });

    it('con datos muestra la fila', () => {
      c.setResult(c.withRow());
      renderPage(c.page, { url: c.url });
      expect(screen.getByText(c.rowText)).toBeInTheDocument();
      expect(screen.queryByText(c.emptyText)).not.toBeInTheDocument();
    });

    it('sin filas muestra el vacío', () => {
      c.setResult(c.withoutRows());
      renderPage(c.page, { url: c.url });
      expect(screen.getByText(c.emptyText)).toBeInTheDocument();
    });

    it('mientras carga muestra el estado de carga', () => {
      c.setResult(loading());
      renderPage(c.page, { url: c.url });
      expect(screen.getByRole('status', { name: c.loadingLabel })).toBeInTheDocument();
    });

    it('un error del back se dice y permite reintentar: no se confunde con «no hay datos»', () => {
      const refetch = vi.fn();
      c.setResult(failed(refetch));
      renderPage(c.page, { url: c.url });
      expect(screen.queryByText(c.emptyText)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      expect(refetch).toHaveBeenCalled();
    });
  });
