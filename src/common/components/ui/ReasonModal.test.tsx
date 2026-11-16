import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReasonModal } from './ReasonModal';

afterEach(cleanup);

const renderModal = (onConfirm = vi.fn(), required = true) =>
  render(
    <ReasonModal
      open
      onClose={vi.fn()}
      onConfirm={onConfirm}
      title="Dar de baja"
      description="Baja lógica: no se borra."
      confirmLabel="Dar de baja"
      loading={false}
      required={required}
    />,
  );

describe('ReasonModal', () => {
  it('enfoca el motivo al abrir', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
  });

  it('sin motivo no confirma y avisa', () => {
    const onConfirm = vi.fn();
    renderModal(onConfirm);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Dar de baja' }));
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Escribí el motivo')).toBeInTheDocument();
  });

  it('con motivo confirma con el texto sin espacios de más', () => {
    const onConfirm = vi.fn();
    renderModal(onConfirm);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  válvula dañada ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(onConfirm).toHaveBeenCalledWith('válvula dañada');
  });

  it('con motivo opcional confirma vacío', () => {
    const onConfirm = vi.fn();
    renderModal(onConfirm, false);
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('muestra ayuda y error a la vez y bloquea cerrar mientras carga', () => {
    const onClose = vi.fn();
    render(
      <ReasonModal
        open
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Entregar"
        description="Motivo obligatorio"
        confirmLabel="Entregar"
        loading
        validateReason={(reason) => (reason.trim().length < 10 ? 'Escribí al menos 10 caracteres' : undefined)}
        reasonHint={(reason) => `${reason.trim().length}/500`}
        serverError="El pedido ya fue cerrado"
      />,
    );
    expect(screen.getByText('0/500')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('El pedido ya fue cerrado');
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
  });
});
