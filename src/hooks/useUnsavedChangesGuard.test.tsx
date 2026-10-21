import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Link, Route, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderRoutes } from '../test/renderRoutes';

const confirmMock = vi.hoisted(() => vi.fn());
const dismissMock = vi.hoisted(() => vi.fn());
vi.mock('../utils/notifications', () => ({ confirm: confirmMock, dismissConfirm: dismissMock }));

import { confirmDiscardChanges, hasUnsavedChanges } from '../utils/unsavedChanges';
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const Form = ({ dirty }: { dirty: boolean }) => {
  const guard = useUnsavedChangesGuard(dirty);
  const navigate = useNavigate();
  return (
    <>
      <Link to="/lista">Ir a la lista</Link>
      <button
        type="button"
        onClick={() => {
          guard.release();
          navigate('/lista');
        }}
      >
        Guardar
      </button>
    </>
  );
};

const renderForm = (dirty: boolean, entries = ['/antes', '/form']) =>
  renderRoutes(
    <>
      <Route path="/antes" element={<p>antes</p>} />
      <Route path="/b" element={<p>pantalla b</p>} />
      <Route path="/form" element={<Form dirty={dirty} />} />
      <Route path="/lista" element={<p>la lista</p>} />
    </>,
    entries,
  );

describe('useUnsavedChangesGuard', () => {
  it('sin cambios deja salir sin preguntar', () => {
    renderForm(false);
    fireEvent.click(screen.getByText('Ir a la lista'));
    expect(screen.getByText('la lista')).toBeInTheDocument();
    expect(confirmMock).not.toHaveBeenCalled();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('con cambios pregunta y, si no confirma, se queda', async () => {
    confirmMock.mockResolvedValue(false);
    renderForm(true);
    fireEvent.click(screen.getByText('Ir a la lista'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({ danger: true })));
    expect(screen.queryByText('la lista')).not.toBeInTheDocument();
  });

  it('con cambios y confirmación, sale', async () => {
    confirmMock.mockResolvedValue(true);
    renderForm(true);
    fireEvent.click(screen.getByText('Ir a la lista'));
    expect(await screen.findByText('la lista')).toBeInTheDocument();
  });

  it('el botón «Atrás» con cambios también pregunta; si no confirma, la entrada se repone', async () => {
    confirmMock.mockResolvedValue(false);
    const { router } = renderForm(true);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() => expect(router.state.location.pathname).toBe('/form'));
    expect(screen.queryByText('antes')).not.toBeInTheDocument();
  });

  it('«Atrás» con cambios y confirmación vuelve a la pantalla anterior', async () => {
    confirmMock.mockResolvedValue(true);
    const { router } = renderForm(true);
    await act(() => router.navigate(-1));
    expect(await screen.findByText('antes')).toBeInTheDocument();
  });

  it('al guardar (release) no pregunta', () => {
    renderForm(true);
    fireEvent.click(screen.getByText('Guardar'));
    expect(screen.getByText('la lista')).toBeInTheDocument();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('avisa también al recargar o cerrar la pestaña', () => {
    renderForm(true);
    const event = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it('dos «Atrás» seguidos dejan una sola confirmación abierta; al cancelar se queda y sigue protegiendo', async () => {
    let cancelFirst: (leave: boolean) => void = () => undefined;
    confirmMock.mockReturnValueOnce(new Promise<boolean>((resolve) => (cancelFirst = resolve)));
    const { router } = renderForm(true, ['/antes', '/b', '/form']);
    await act(() => router.navigate(-1));
    await act(() => router.navigate(-1));
    expect(confirmMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      cancelFirst(false);
      await Promise.resolve();
    });
    await waitFor(() => expect(router.state.location.pathname).toBe('/form'));
    // sigue protegiendo: un nuevo «Atrás» vuelve a preguntar
    confirmMock.mockResolvedValueOnce(false);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(2));
  });

  it('cancelar el primero y aceptar el segundo no rompe el bloqueador ni deja de proteger', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    confirmMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { router } = renderForm(true, ['/antes', '/b', '/form']);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    await act(() => router.navigate(-1));
    await waitFor(() => expect(router.state.location.pathname).toBe('/b'));
    expect(errors.mock.calls.flat().join(' ')).not.toContain('Invalid blocker state');
    errors.mockRestore();
  });

  it('al desmontar con un aviso abierto (cierre de sesión forzado) se cierra el aviso y no navega al resolverse', async () => {
    let answer: (leave: boolean) => void = () => undefined;
    confirmMock.mockReturnValueOnce(new Promise<boolean>((resolve) => (answer = resolve)));
    const { router, unmount } = renderForm(true, ['/antes', '/form']);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    unmount();
    expect(dismissMock).toHaveBeenCalledWith('unsaved-changes');
    await act(async () => {
      answer(true);
      await Promise.resolve();
    });
    expect(router.state.location.pathname).toBe('/form');
  });

  it('con cambios, cerrar sesión o «Ver como» piden confirmar antes (confirmDiscardChanges)', async () => {
    confirmMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderForm(true);
    expect(hasUnsavedChanges()).toBe(true);
    expect(await confirmDiscardChanges()).toBe(false);
    expect(hasUnsavedChanges()).toBe(true);
    expect(await confirmDiscardChanges()).toBe(true);
    // ya confirmado: el aviso de recarga no vuelve a saltar
    expect(hasUnsavedChanges()).toBe(false);
  });
});
