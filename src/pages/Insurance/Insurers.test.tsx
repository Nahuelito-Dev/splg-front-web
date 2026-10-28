import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeListStates, mutation, ok, pageOf, renderPage } from '../../test/pageTest';

const q = vi.hoisted(() => ({ list: vi.fn(), remove: undefined as unknown, create: undefined as unknown }));
const confirmMock = vi.hoisted(() => vi.fn<[{ text: string }], Promise<boolean>>());

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canWrite: true, writeHint: undefined }),
}));
vi.mock('../../services/queries/insurance', () => ({
  useInsurers: () => q.list() as unknown,
  useDeleteInsurer: () => q.remove,
  useCreateInsurer: () => q.create,
  useUpdateInsurer: () => mutation(),
}));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirm: confirmMock,
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('../../common/components/ui/ResponsiveTable', () => import('../../test/responsiveTableStub'));

import { Insurers } from './Insurers';

const INSURER = {
  insurerId: 'i-1',
  name: 'Sancor Seguros',
  taxId: '30500050817',
  phone: '3764 111111',
  email: null,
  website: null,
  paymentUrl: 'https://pagos.sancor.test',
  notes: null,
};

beforeEach(() => {
  q.remove = mutation();
  q.create = mutation();
  q.list.mockReturnValue(ok(pageOf([INSURER])));
  confirmMock.mockReset();
});
afterEach(cleanup);

describeListStates({
  name: 'Aseguradoras',
  url: '/fleet/insurers',
  page: <Insurers />,
  setResult: (r) => q.list.mockReturnValue(r),
  withRow: () => ok(pageOf([INSURER])),
  withoutRows: () => ok(pageOf([])),
  rowText: 'Sancor Seguros',
  emptyText: 'Todavía no hay aseguradoras',
  loadingLabel: 'Cargando aseguradoras',
});

describe('Insurers', () => {
  it('el alta valida el CUIT con su dígito verificador', async () => {
    renderPage(<Insurers />, { url: '/fleet/insurers' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva aseguradora' }));
    fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: 'La Segunda' } });
    fireEvent.change(screen.getByLabelText(/CUIT/), { target: { value: '30-11111111-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear aseguradora' }));
    expect(await screen.findByText(/No es un CUIT válido/)).toBeInTheDocument();
    expect((q.create as ReturnType<typeof mutation>).mutate).not.toHaveBeenCalled();
  });

  it('el alta manda el CUIT sin guiones y el enlace de pago', async () => {
    renderPage(<Insurers />, { url: '/fleet/insurers' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva aseguradora' }));
    fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: 'Sancor' } });
    fireEvent.change(screen.getByLabelText(/CUIT/), { target: { value: '30-50005081-7' } });
    fireEvent.change(screen.getByLabelText(/Enlace de pago/), { target: { value: 'https://pagos.sancor.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear aseguradora' }));
    const m = q.create as ReturnType<typeof mutation>;
    await waitFor(() => expect(m.mutate).toHaveBeenCalled());
    expect(m.mutate.mock.calls[0][0]).toMatchObject({
      scope: 'insurer:new',
      body: { name: 'Sancor', taxId: '30500050817', paymentUrl: 'https://pagos.sancor.test', phone: null },
    });
  });

  it('la baja pide confirmación y es lógica', async () => {
    confirmMock.mockResolvedValue(true);
    renderPage(<Insurers />, { url: '/fleet/insurers' });
    fireEvent.click(screen.getByRole('button', { name: /Dar de baja/ }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(confirmMock.mock.calls[0][0].text).toMatch(/No se borra/);
    await waitFor(() => expect((q.remove as ReturnType<typeof mutation>).mutate).toHaveBeenCalled());
    expect((q.remove as ReturnType<typeof mutation>).mutate.mock.calls[0][0]).toBe('i-1');
  });

  it('si no confirma, no se da de baja', async () => {
    confirmMock.mockResolvedValue(false);
    renderPage(<Insurers />, { url: '/fleet/insurers' });
    fireEvent.click(screen.getByRole('button', { name: /Dar de baja/ }));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect((q.remove as ReturnType<typeof mutation>).mutate).not.toHaveBeenCalled();
  });
});
