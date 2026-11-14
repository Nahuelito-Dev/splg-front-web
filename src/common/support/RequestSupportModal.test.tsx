import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../services/api/errors';

const COMPANY = '3f2b6c1e-8a1d-4c55-9a0e-5b8f1f7f2a10';
const mutateAsync = vi.fn();
const update = vi.fn();
const navigate = vi.fn();
const notify = vi.hoisted(() => ({ success: vi.fn() }));

vi.mock('../../services/queries/distributors', () => ({
  useDistributors: () => ({
    data: [
      { distributor_id: COMPANY, name: 'Gas Norte', status: 'active' },
      { distributor_id: 'b1c0f1aa-0000-4000-8000-000000000002', name: 'Gas Suspendida', status: 'suspended' },
    ],
    isPending: false,
    error: null,
  }),
}));
vi.mock('../../services/queries/supportSessions', () => ({
  useRequestSupportSession: () => ({ mutateAsync: (b: unknown) => mutateAsync(b) as unknown, isPending: false }),
}));
vi.mock('../../services/api/supportMode', () => ({
  supportMode: {
    update: (s: unknown) => {
      update(s);
    },
  },
}));
vi.mock('../../utils/notifications', () => ({ notify }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

import { RequestSupportModal } from './RequestSupportModal';

const REASON = 'El tablero de despacho no muestra los pedidos de hoy';
const onClose = vi.fn();

const fill = () => {
  fireEvent.change(screen.getByLabelText(/Empresa/), { target: { value: COMPANY } });
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: REASON } });
};
const submit = (name: RegExp = /^Pedir acceso$/) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  render(<RequestSupportModal open onClose={onClose} />);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RequestSupportModal', () => {
  it('ofrece sólo empresas activas y 60 minutos por omisión', () => {
    expect(screen.getByRole('option', { name: 'Gas Norte' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Gas Suspendida' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Duración/)).toHaveValue('60');
  });

  it('valida como la API: empresa y motivo de 20 caracteres', async () => {
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'corto' } });
    submit();
    expect(await screen.findByText('Elegí la empresa')).toBeInTheDocument();
    expect(screen.getByText(/al menos 20 caracteres/)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('una emergencia no puede pasar de 60 minutos', async () => {
    fill();
    fireEvent.change(screen.getByLabelText(/Duración/), { target: { value: '120' } });
    fireEvent.click(screen.getByLabelText(/Acceso de emergencia/));
    submit(/Abrir acceso de emergencia/);
    expect(await screen.findByText(/como máximo 60 minutos/, { selector: '[role="alert"]' })).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('pedido consentido: queda pendiente, avisa y lo aplica sin navegar', async () => {
    const pending = { id: 's-1', status: 'pending', distributorName: 'Gas Norte' };
    mutateAsync.mockResolvedValue(pending);
    fill();
    fireEvent.click(screen.getByLabelText(/Archivos/));
    submit();
    await waitFor(() => expect(update).toHaveBeenCalledWith(pending));
    expect(mutateAsync).toHaveBeenCalledWith({
      distributorId: COMPANY,
      reason: REASON,
      ticketRef: undefined,
      minutes: 60,
      scope: ['files'],
      emergency: false,
    });
    expect(notify.success).toHaveBeenCalledWith('Pedido enviado: esperá que Gas Norte lo apruebe');
    expect(navigate).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('emergencia activa al instante: va al inicio y entra en modo soporte', async () => {
    const active = { id: 's-2', status: 'active', distributorName: 'Gas Norte' };
    mutateAsync.mockResolvedValue(active);
    fill();
    fireEvent.change(screen.getByLabelText(/Duración/), { target: { value: '30' } });
    fireEvent.click(screen.getByLabelText(/Acceso de emergencia/));
    submit(/Abrir acceso de emergencia/);
    await waitFor(() => expect(update).toHaveBeenCalledWith(active));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ emergency: true, minutes: 30 }));
    expect(navigate).toHaveBeenCalledWith('/home');
  });

  it('un rechazo de la API (emergencia deshabilitada) se muestra y no entra', async () => {
    mutateAsync.mockRejectedValue(
      new ApiError(403, ['La empresa no permite accesos de emergencia'], 'SUPPORT_EMERGENCY_DISABLED'),
    );
    fill();
    fireEvent.click(screen.getByLabelText(/Acceso de emergencia/));
    submit(/Abrir acceso de emergencia/);
    expect(await screen.findByText('La empresa no permite accesos de emergencia')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
