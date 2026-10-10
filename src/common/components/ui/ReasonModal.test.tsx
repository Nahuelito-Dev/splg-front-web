import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  it('sin motivo no confirma y avisa', () => {
    const onConfirm = vi.fn();
    renderModal(onConfirm);
    fireEvent.click(screen.getByRole('button', { name: 'Dar de baja' }));
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
});
