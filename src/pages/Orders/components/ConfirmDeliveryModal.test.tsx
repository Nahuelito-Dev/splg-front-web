import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDeliveryModal } from './ConfirmDeliveryModal';

afterEach(cleanup);

const renderModal = (onConfirm = vi.fn(), confirming = false, onClose = vi.fn(), onEdit = vi.fn()) =>
  render(
    <ConfirmDeliveryModal
      open
      onClose={onClose}
      onConfirm={onConfirm}
      confirming={confirming}
      onEdit={onEdit}
      defaultCode="ABC123"
    />,
  );

describe('ConfirmDeliveryModal', () => {
  it('enfoca el código al abrir', async () => {
    renderModal();
    await waitFor(() => expect(screen.getByLabelText('Código de entrega')).toHaveFocus());
  });

  it('pide código y motivo válido antes de confirmar', () => {
    const onConfirm = vi.fn();
    renderModal(onConfirm);
    const confirm = screen.getByRole('button', { name: 'Confirmar entrega' });
    expect(confirm).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), { target: { value: 'recibido' } });
    fireEvent.blur(screen.getByRole('textbox', { name: /Motivo/ }));
    expect(screen.getByText('Escribí al menos 10 caracteres')).toBeInTheDocument();
    expect(screen.getByText('8/500')).toBeInTheDocument();
    expect(confirm).toHaveAttribute('aria-disabled', 'true');

    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), {
      target: { value: '  Cliente confirmó por teléfono  ' },
    });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('ABC123', 'Cliente confirmó por teléfono');
  });

  it('muestra el error del back sin borrar lo escrito y lo limpia al editar', () => {
    const onEdit = vi.fn();
    render(
      <ConfirmDeliveryModal
        open
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        confirming={false}
        error="reason must be longer than or equal to 10 characters"
        onEdit={onEdit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Código de entrega'), { target: { value: 'XYZ' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), { target: { value: 'Cliente llamó al local' } });
    expect(screen.getByRole('alert')).toHaveTextContent('reason must be longer than or equal to 10 characters');
    expect(screen.getByLabelText('Código de entrega')).toHaveValue('XYZ');
    expect(screen.getByRole('textbox', { name: /Motivo/ })).toHaveValue('Cliente llamó al local');
    expect(onEdit).toHaveBeenCalled();
  });

  it('bloquea confirmar y cerrar mientras se está enviando', () => {
    const onClose = vi.fn();
    renderModal(vi.fn(), true, onClose);
    expect(screen.getByRole('button', { name: 'Confirmar entrega' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
