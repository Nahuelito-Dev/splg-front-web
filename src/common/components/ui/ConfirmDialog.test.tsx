import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirm } from '../../../utils/notifications';
import { ConfirmDialogHost } from './ConfirmDialog';
import { Drawer } from './Drawer';
import { Modal } from './Modal';

afterEach(cleanup);

describe('ConfirmDialogHost', () => {
  it('resuelve true al confirmar', async () => {
    render(<ConfirmDialogHost />);
    let result: Promise<boolean> = Promise.resolve(false);
    act(() => {
      result = confirm({ title: '¿Seguro?', text: 'Detalle', confirmText: 'Sí, borrar' });
    });
    expect(await screen.findByRole('dialog', { name: '¿Seguro?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    await expect(result).resolves.toBe(true);
  });

  it('resuelve false al cancelar y en una baja el foco arranca en Cancelar', async () => {
    render(<ConfirmDialogHost />);
    let result: Promise<boolean> = Promise.resolve(true);
    act(() => {
      result = confirm({ title: 'Borrar', danger: true });
    });
    const cancel = await screen.findByRole('button', { name: 'Cancelar' });
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);
    await expect(result).resolves.toBe(false);
  });

  it('encola confirmaciones simultáneas', async () => {
    render(<ConfirmDialogHost />);
    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(false);
    act(() => {
      first = confirm({ title: 'Primera' });
      second = confirm({ title: 'Segunda' });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await expect(first).resolves.toBe(true);
    expect(await screen.findByRole('dialog', { name: 'Segunda' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await expect(second).resolves.toBe(false);
  });
});

describe('foco entre solicitudes de la cola', () => {
  it('una confirmación peligrosa que sigue a otra arranca con el foco en Cancelar, no en el botón que destruye', async () => {
    render(<ConfirmDialogHost />);
    let first: Promise<boolean> = Promise.resolve(false);
    let second: Promise<boolean> = Promise.resolve(true);
    act(() => {
      first = confirm({ title: 'Primera' });
      second = confirm({ title: 'Borrar todo', confirmText: 'Borrar', danger: true });
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await expect(first).resolves.toBe(true);
    const cancel = await screen.findByRole('button', { name: 'Cancelar' });
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(screen.getByRole('button', { name: 'Borrar' })).not.toHaveFocus();
    fireEvent.click(cancel);
    await expect(second).resolves.toBe(false);
  });
});

describe.each([
  [
    'Modal',
    (onClose: () => void, children: React.ReactNode) => (
      <Modal open onClose={onClose} title="Ficha">
        {children}
      </Modal>
    ),
  ],
  [
    'Drawer',
    (onClose: () => void, children: React.ReactNode) => (
      <Drawer open onClose={onClose} title="Ficha">
        {children}
      </Drawer>
    ),
  ],
])('confirmación encima de un %s', (_name, wrap) => {
  const setup = () => {
    const onClose = vi.fn();
    const results: boolean[] = [];
    render(
      <>
        {wrap(
          onClose,
          <button
            type="button"
            onClick={() => void confirm({ title: '¿Borrar?', danger: true }).then((r) => results.push(r))}
          >
            Borrar
          </button>,
        )}
        <ConfirmDialogHost />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    return { onClose, results };
  };

  it('el foco arranca en Cancelar y Cancelar deja el panel abierto', async () => {
    const { onClose, results } = setup();
    const cancel = await screen.findByRole('button', { name: 'Cancelar' });
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);
    await waitFor(() => expect(results).toEqual([false]));
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Ficha' })).toBeInTheDocument();
  });

  it('Esc cierra sólo la confirmación y el panel sigue abierto', async () => {
    const { onClose, results } = setup();
    const confirmDialog = await screen.findByRole('dialog', { name: '¿Borrar?' });
    fireEvent.keyDown(confirmDialog, { key: 'Escape' });
    await waitFor(() => expect(results).toEqual([false]));
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Ficha' })).toBeInTheDocument();
  });

  it('confirmar resuelve true y tampoco cierra el panel', async () => {
    const { onClose, results } = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(results).toEqual([true]));
    expect(onClose).not.toHaveBeenCalled();
  });
});
