import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupportSession } from '../../services/api/types';
import { renderPage } from '../../test/pageTest';

const q = vi.hoisted(() => ({
  permissions: { allPermissions: false, permissions: ['soporte.ver', 'soporte.gestionar'] } as unknown,
  pending: [] as unknown[],
  active: [] as unknown[],
  all: [] as unknown[],
  approve: vi.fn(),
  reject: vi.fn(),
  revoke: vi.fn(),
  updatePolicy: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
}));

const page = (rows: unknown[]) => ({
  data: { rows, total: rows.length },
  isPending: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
});
const idle = (mutate: unknown) => ({ mutate, isPending: false });

vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));
vi.mock('../../services/queries/permissions', () => ({
  useMyPermissions: () => ({ data: q.permissions, error: null }),
}));
vi.mock('../../hooks/reduxHooks', () => ({ useAppSelector: () => 'admin@splg.com' }));
vi.mock('../../services/queries/supportSessions', () => ({
  usePlatform: () => ({ data: { name: 'Plataforma X', legalName: 'X', supportEmail: null } }),
  useSupportAccessList: (_p: unknown, status?: string) => page(status === 'pending' ? q.pending : q.all),
  useActiveSupportAccess: () => page(q.active),
  useSupportAccess: () => ({ data: undefined }),
  useSupportAccessEntries: () => page([]),
  useApproveSupportAccess: () => idle(q.approve),
  useRejectSupportAccess: () => idle(q.reject),
  useRevokeSupportAccess: () => idle(q.revoke),
  useSupportPolicy: () => ({
    data: { emergencyAllowed: true, autoApprove: false },
    isPending: false,
    error: null,
    refetch: vi.fn(),
  }),
  useUpdateSupportPolicy: () => idle(q.updatePolicy),
}));
vi.mock('../../utils/notifications', () => ({
  confirm: (o: unknown) => q.confirm(o) as unknown,
  notify: { success: q.success, error: vi.fn() },
}));

const photoLink = vi.hoisted(() => vi.fn());
vi.mock('../../services/api/photos', () => ({ getPhotoLink: photoLink }));

import { SupportAccess } from './SupportAccess';

const session = (over: Partial<SupportSession> = {}): SupportSession => ({
  id: 's-1',
  distributorId: 'd-1',
  distributorName: 'Gas Norte',
  requestedBy: { userId: 'u-1', fullName: 'Soporte Uno', photoUrl: null },
  kind: 'consented',
  status: 'pending',
  reason: 'El tablero de despacho no muestra los pedidos de hoy',
  ticketRef: null,
  scope: ['personal_data', 'files'],
  requestedMinutes: 60,
  requestExpiresAt: '2026-11-14T21:37:15.728Z',
  decidedBy: null,
  decidedAt: null,
  decisionNote: null,
  startedAt: null,
  expiresAt: null,
  endedAt: null,
  endedBy: null,
  endReason: null,
  createdAt: '2026-11-13T21:37:15.728Z',
  ...over,
});

beforeEach(() => {
  q.permissions = { allPermissions: false, permissions: ['soporte.ver', 'soporte.gestionar'] };
  q.pending = [session()];
  q.active = [];
  q.all = [session()];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const open = () => renderPage(<SupportAccess />, { url: '/support-access' });

describe('SupportAccess', () => {
  it('sin soporte.ver no muestra nada de los accesos', () => {
    q.permissions = { allPermissions: false, permissions: ['pedidos.ver'] };
    open();
    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
    expect(screen.queryByText('Pendientes')).not.toBeInTheDocument();
  });

  it('muestra el pedido pendiente con quién, motivo, duración y alcance, y el nombre de la plataforma', () => {
    open();
    expect(screen.getByText('· soporte de Plataforma X')).toBeInTheDocument();
    expect(screen.getAllByText('El tablero de despacho no muestra los pedidos de hoy').length).toBeGreaterThan(0);
    expect(screen.getByText('60 min')).toBeInTheDocument();
    expect(screen.getByText('Datos personales')).toBeInTheDocument();
  });

  it('aprobar pide confirmar en la página y deja acortar y achicar el alcance', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(q.approve).not.toHaveBeenCalled();
    expect(screen.getByText(/¿Aprobar\? El reloj arranca ahora/)).toBeInTheDocument();
    // No se puede pedir más que lo pedido: no hay 120.
    expect(screen.queryByRole('option', { name: '120 minutos' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Duración/), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Archivos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprobación' }));
    await waitFor(() =>
      expect(q.approve).toHaveBeenCalledWith(
        { id: 's-1', body: { minutes: 30, scope: ['personal_data'], note: undefined } },
        expect.any(Object),
      ),
    );
  });

  it('rechazar también se confirma en la página', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'No es necesario' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));
    await waitFor(() =>
      expect(q.reject).toHaveBeenCalledWith({ id: 's-1', body: { note: 'No es necesario' } }, expect.any(Object)),
    );
  });

  it('sin soporte.gestionar ve los pedidos pero no puede decidir', () => {
    q.permissions = { allPermissions: false, permissions: ['soporte.ver'] };
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    expect(screen.queryByText(/¿Aprobar\?/)).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Permitir accesos de emergencia' })).toBeDisabled();
  });

  it('la sesión activa se revoca después de confirmar', async () => {
    q.active = [session({ id: 's-9', status: 'active', expiresAt: '2026-11-13T22:30:00.000Z' })];
    q.confirm.mockResolvedValue(true);
    open();
    expect(screen.getByText(/Soporte Uno tiene acceso de lectura hasta las/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Revocar' }));
    await waitFor(() => expect(q.revoke).toHaveBeenCalledWith('s-9', expect.any(Object)));
    expect(q.confirm).toHaveBeenCalledWith(expect.objectContaining({ danger: true }));
  });

  it('si no confirma, no revoca', async () => {
    q.active = [session({ id: 's-9', status: 'active' })];
    q.confirm.mockResolvedValue(false);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Revocar' }));
    await waitFor(() => expect(q.confirm).toHaveBeenCalled());
    expect(q.revoke).not.toHaveBeenCalled();
  });

  it('la política: prender la autoaprobación la guarda en la API', () => {
    open();
    fireEvent.click(screen.getByRole('switch', { name: 'Aprobar los pedidos automáticamente' }));
    expect(q.updatePolicy).toHaveBeenCalledWith({ autoApprove: true }, expect.any(Object));
  });

  it('el enlace del aviso (?session=) abre el detalle de esa sesión', () => {
    renderPage(<SupportAccess />, { url: '/support-access?session=s-1', path: '/support-access' });
    expect(screen.getByRole('dialog', { name: 'Acceso de soporte' })).toBeInTheDocument();
    expect(screen.getByText('Qué miró')).toBeInTheDocument();
  });

  describe('la foto de quien del soporte pidió el acceso', () => {
    const PHOTO = 'https://fotos.test/soporte-uno.jpg?X-Amz-Signature=abc';
    const withPhoto = () =>
      session({ status: 'ended', requestedBy: { userId: 'u-1', fullName: 'Soporte Uno', photoUrl: PHOTO } });

    it('se ve en el historial si la API la manda', () => {
      q.pending = [];
      q.all = [withPhoto()];
      const { container } = open();
      expect(container.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
    });

    it('sin foto quedan las iniciales', () => {
      q.pending = [];
      q.all = [session({ status: 'ended' })];
      const { container } = open();
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('SU')).toBeInTheDocument();
    });

    it('si la URL venció no se le pide a la API (la cuenta es de la plataforma: sería un 404): quedan las iniciales', () => {
      q.pending = [];
      q.all = [withPhoto()];
      const { container } = open();
      const img = container.querySelector('img');
      if (!img) throw new Error('Sin la foto');
      fireEvent.error(img);
      expect(photoLink).not.toHaveBeenCalled();
      expect(container.querySelector('img')).toBeNull();
      expect(screen.getByText('SU')).toBeInTheDocument();
    });
  });
});
