import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const permissions = vi.hoisted(() => vi.fn());
const narrow = vi.hoisted(() => ({ value: false }));
vi.mock('@mui/material', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useMediaQuery: () => narrow.value,
}));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: permissions,
  useBackToList: () => () => undefined,
}));
vi.mock('../../common/components', () => ({
  useCrumbLeaf: () => undefined,
  PdfButton: ({ label }: { label?: string }) => <button type="button">{label ?? 'PDF'}</button>,
}));
vi.mock('../../services/queries/pdfs', () => ({ useDownloadPdf: () => ({ mutate: vi.fn(), isPending: false }) }));

const finance = vi.hoisted(() => ({ box: undefined as unknown, sessions: undefined as unknown, sessionsId: vi.fn() }));
vi.mock('../../services/queries/finance', () => ({
  useCashBox: () => ({ data: finance.box, isPending: false, error: null, refetch: vi.fn() }),
  useCashSessions: (id: string) => {
    finance.sessionsId(id);
    return { data: finance.sessions, isFetching: false, error: null, refetch: vi.fn() };
  },
  useCashSession: () => ({
    data: { openedAt: '2026-10-20T12:00:00Z', openedByUserId: 'u-1', openingAmount: 5000, currentBalance: 7000 },
  }),
}));
vi.mock('../../services/queries/userNames', () => ({
  useUserNames: () => ({ nameOf: (id: string | null) => (id === 'u-1' ? 'Ana Cajera' : null), loading: false }),
}));
vi.mock('./components/OpenSessionModal', () => ({
  OpenSessionModal: ({ open }: { open: boolean }) => (open ? <div>Modal abrir</div> : null),
}));
vi.mock('./components/CloseSessionModal', () => ({
  CloseSessionModal: ({ open }: { open: boolean }) => (open ? <div>Modal cerrar</div> : null),
}));

import { CashBoxDetails } from './CashBoxDetails';

afterEach(() => {
  cleanup();
  narrow.value = false;
  finance.sessionsId.mockReset();
});

const box = {
  cashBoxId: 'box-1',
  name: 'Prueba mostrador',
  kind: 'cash',
  balance: 7000,
  requiresSession: true,
  isActive: true,
  openSessionId: null,
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-02T12:00:00Z',
};
const closedSession = {
  sessionId: 's-1',
  cashBoxId: 'box-1',
  cashBoxName: 'Prueba mostrador',
  status: 'closed',
  openedAt: '2026-10-19T12:00:00Z',
  openedByUserId: 'u-1',
  openingAmount: 5000,
  closedAt: '2026-10-19T20:00:00Z',
  closedByUserId: 'u-1',
  expectedAmount: 7000,
  countedAmount: 6900,
  difference: -100,
  notes: null,
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/finance/boxes/box-1']}>
      <Routes>
        <Route path="finance/boxes/:id" element={<CashBoxDetails />} />
      </Routes>
    </MemoryRouter>,
  );

describe('CashBoxDetails (CU-225, 226, 227)', () => {
  it('muestra la caja, su saldo y el historial de sesiones con quién abrió y cerró', () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    finance.box = box;
    finance.sessions = { data: [closedSession], total: 1 };
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Prueba mostrador' })).toBeInTheDocument();
    expect(finance.sessionsId).toHaveBeenCalledWith('box-1');
    expect(screen.getAllByText('por Ana Cajera').length).toBe(2);
  });

  it('con la caja cerrada ofrece abrirla', () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    finance.box = box;
    finance.sessions = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Sin sesiones')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar con arqueo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir caja' }));
    expect(screen.getByText('Modal abrir')).toBeInTheDocument();
  });

  it('con la caja abierta muestra la sesión en curso y ofrece cerrar con arqueo', () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    finance.box = { ...box, openSessionId: 's-2' };
    finance.sessions = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Sesión en curso')).toBeInTheDocument();
    expect(screen.getByText('Ana Cajera')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar con arqueo' }));
    expect(screen.getByText('Modal cerrar')).toBeInTheDocument();
  });

  it('una caja sin sesión no ofrece abrir ni cerrar', () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    finance.box = { ...box, requiresSession: false };
    finance.sessions = { data: [], total: 0 };
    renderPage();
    expect(screen.queryByRole('button', { name: 'Abrir caja' })).not.toBeInTheDocument();
  });

  it('el saldo se muestra con centavos', () => {
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    finance.box = { ...box, balance: 7000.5 };
    finance.sessions = { data: [], total: 0 };
    renderPage();
    expect(screen.getByText('Saldo según el libro').closest('div')?.parentElement).toHaveTextContent('7.000,50');
  });

  it('en móvil cada sesión cerrada muestra contado, esperado y el importe de la diferencia, con centavos', () => {
    narrow.value = true;
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    finance.box = box;
    finance.sessions = {
      data: [{ ...closedSession, expectedAmount: 7000.5, countedAmount: 6900.25, difference: -100.25 }],
      total: 1,
    };
    renderPage();
    expect(screen.getByText(/Contado/).parentElement).toHaveTextContent('6.900,25');
    expect(screen.getByText(/Contado/).parentElement).toHaveTextContent('7.000,50');
    expect(screen.getByText(/100,25/)).toBeInTheDocument();
    expect(screen.getByText('Faltante')).toBeInTheDocument();
  });

  it('en móvil el cierre en PDF se ofrece sólo en la sesión cerrada', () => {
    narrow.value = true;
    permissions.mockReturnValue({ canWrite: true, writeHint: undefined });
    finance.box = box;
    finance.sessions = {
      data: [closedSession, { ...closedSession, sessionId: 's-2', status: 'open', closedAt: null }],
      total: 2,
    };
    renderPage();
    expect(screen.getAllByRole('button', { name: 'Cierre (PDF)' })).toHaveLength(1);
  });
});
